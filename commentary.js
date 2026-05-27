/* Mikdash commentary v8 */
(function () {

  /* Hebrew gematria -> integer */
  var HE = '.א.ב.ג.ד.ה.ו.ז.ח.ט.י.יא.יב.יג.יד.טו.טז.יז.יח.יט.כ.כא.כב.כג.כד.כה.כו.כז.כח.כט.ל.לא.לב.לג.לד.לה.לו.לז.לח.לט.מ.מא.מב.מג.מד.מה.מו.מז.מח.מט.נ.נא.נב.נג.נד.נה.נו.נז.נח.נט.ס.סא.סב.סג.סד.סה.סו.סז.סח.סט.ע.עא.עב.עג.עד.עה.עו.עז.עח.עט.פ.פא.פב.פג.פד.פה.פו.פז.פח.פט.צ.צא.צב.צג.צד.צה.צו.צז.צח.צט.ק'.split('.');
  var heToN={};
  HE.forEach(function(h,i){if(h)heToN[h]=i;});

  /* CSS */
  var st=document.createElement('style');
  st.textContent=
    "@import url('https://fonts.googleapis.com/css2?family=Noto+Rashi+Hebrew:wght@400;700&display=swap');"+
    ".mkd-block{margin-top:10px;padding:10px 14px;background:var(--bg2);border-radius:6px;border:1px solid var(--line);direction:rtl;text-align:right}"+
    ".mkd-label{font-size:9px;font-weight:700;letter-spacing:.12em;color:var(--gold);text-transform:uppercase;margin-bottom:6px;font-family:var(--font)}"+
    ".mkd-entry{font-family:'Noto Rashi Hebrew','Frank Ruhl Libre',serif;font-size:13px;line-height:1.85;color:var(--t2);margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--line2)}"+
    ".mkd-entry:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0}"+
    ".mkd-dib{font-weight:700;color:var(--gold);display:block;margin-bottom:2px}"+
    ".mkd-toggle{font-size:12px;font-weight:500;padding:5px 14px;border-radius:50px;border:1px solid var(--line);background:var(--bg3);color:var(--t1);cursor:pointer;font-family:var(--font)}"+
    ".mkd-toggle.off{background:transparent;color:var(--t3)}";
  document.head.appendChild(st);

  function strip(s){
    return(s||'').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ')
      .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
      .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
  }
  function flat(a){
    return Array.isArray(a)?a.flat(10).map(function(x){return typeof x==='string'?strip(x):'';}).filter(Boolean):[];
  }
  function byVerse(raw){
    return Array.isArray(raw)?raw.map(function(v){
      return Array.isArray(v)?flat(v):(strip(v)?[strip(v)]:[]);
    }):[];
  }
  function dib(text){
    var c=text.indexOf(': '),d=text.indexOf('. '),cut=-1;
    if(c>3&&c<55)cut=c+2; else if(d>3&&d<55)cut=d+2;
    if(cut>0&&text.length-cut>4)return[text.slice(0,cut-1).trim(),text.slice(cut).trim()];
    return['',text];
  }
  function fetchComm(ref,cb){
    fetch('https://www.sefaria.org/api/texts/'+encodeURIComponent(ref)+'?context=0&pad=0&commentary=0&wrapLinks=0')
      .then(function(r){return r.ok?r.json():null;}).then(cb).catch(function(){cb(null);});
  }
  function buildBlock(entries,label){
    var w=document.createElement('div'); w.className='mkd-block';
    var l=document.createElement('div'); l.className='mkd-label'; l.textContent=label; w.appendChild(l);
    entries.forEach(function(text){
      var e=document.createElement('div'); e.className='mkd-entry';
      var pair=dib(text);
      if(pair[0]){var d=document.createElement('span');d.className='mkd-dib';d.textContent=pair[0];e.appendChild(d);}
      e.appendChild(document.createTextNode(pair[1]||text));
      w.appendChild(e);
    });
    return w;
  }

  var rashiOn=true;
  function toggleAll(){
    rashiOn=!rashiOn;
    document.querySelectorAll('.mkd-block').forEach(function(el){el.style.display=rashiOn?'':'none';});
    document.querySelectorAll('.mkd-toggle').forEach(function(el){
      el.textContent=rashiOn?'Commentary On':'Commentary Off';
      el.classList.toggle('off',!rashiOn);
    });
  }
  function ensureToggle(){
    if(document.querySelector('.mkd-toggle')) return;
    var btns=document.querySelectorAll('button');
    for(var i=0;i<btns.length;i++){
      if(btns[i].textContent.indexOf('Translation')>=0){
        var t=document.createElement('button');
        t.className='mkd-toggle'; t.textContent='Commentary On'; t.onclick=toggleAll;
        btns[i].parentNode.insertBefore(t,btns[i].nextSibling);
        return;
      }
    }
  }

  function getScroll(){
    var all=document.querySelectorAll('div');
    for(var i=0;i<all.length;i++){
      var el=all[i],cs=window.getComputedStyle(el);
      if((cs.overflowY==='auto'||cs.overflowY==='scroll')&&el.scrollHeight>400&&el.children.length>=1) return el;
    }
    return null;
  }

  /*
   * TWO injection strategies based on renderer:
   *
   * _e() = Prophets/Writings: verse divs have span{verticalAlign:super} with Hebrew num
   *   DOM: sc > div{maxWidth:680} > [header, div{} > [verse divs{marginBottom:20}]]
   *   Strategy: find spans with verticalAlign:super, get parent div, match by Hebrew num
   *
   * ve() = Torah/Mishnah: NO verse number in DOM at all
   *   DOM: sc > div{maxWidth:680} > [header div, verse divs{marginBottom:24}]  
   *   Strategy: skip header (first child), use child INDEX as verse number
   *
   * We detect which renderer by checking if any span{verticalAlign:super} exists
   */
  function inject(commRef, label){
    fetchComm(commRef, function(data){
      if(!data||!data.he) return;
      var comm=byVerse(data.he);
      if(!comm.some(function(v){return v.length;})) return;
      document.querySelectorAll('.mkd-block').forEach(function(el){el.remove();});

      var sc=getScroll(); if(!sc) return;
      var outer=sc.children[0]; if(!outer) return;

      /* Check if this is _e() (has superscript spans) or ve() (no superscript) */
      var superSpans=outer.querySelectorAll('span');
      var hasSuper=false;
      for(var i=0;i<superSpans.length;i++){
        if(window.getComputedStyle(superSpans[i]).verticalAlign==='super'){hasSuper=true;break;}
      }

      if(hasSuper){
        /* _e() mode: find each superscript span, get verse num, find wrapper */
        var processed={};
        for(var j=0;j<superSpans.length;j++){
          var sp=superSpans[j];
          if(window.getComputedStyle(sp).verticalAlign!=='super') continue;
          var txt=sp.textContent.trim();
          var vn=heToN[txt]||(parseInt(txt)||null);
          if(!vn) continue;
          /* wrapper = the div containing this span that has marginBottom set */
          var wrapper=sp.parentNode;
          while(wrapper&&wrapper!==outer){
            var mb=parseInt(window.getComputedStyle(wrapper).marginBottom);
            if(mb>=15&&mb<=30) break;
            wrapper=wrapper.parentNode;
          }
          if(!wrapper||wrapper===outer) continue;
          if(processed[vn]) continue;
          processed[vn]=true;
          var entries=comm[vn-1];
          if(!entries||!entries.length) continue;
          if(wrapper.querySelector('.mkd-block')) continue;
          var block=buildBlock(entries,label);
          if(!rashiOn) block.style.display='none';
          wrapper.appendChild(block);
        }
      } else {
        /* ve() mode: children of outer = [header, verse1, verse2, ...]
           verse number = child index (1-based, skipping header) */
        var children=outer.children;
        var verseIdx=0;
        for(var k=0;k<children.length;k++){
          var child=children[k];
          /* Skip header: it has textAlign:center and borderBottom */
          var cs=window.getComputedStyle(child);
          if(cs.textAlign==='center'||parseInt(cs.marginBottom)>28) continue;
          verseIdx++;
          var entries=comm[verseIdx-1];
          if(!entries||!entries.length) continue;
          if(child.querySelector('.mkd-block')) continue;
          var block=buildBlock(entries,label);
          if(!rashiOn) block.style.display='none';
          child.appendChild(block);
        }
      }
    });
  }

  /* Fetch interceptor */
  var origFetch=window.fetch.bind(window);
  var lastRef=null;

  window.fetch=function(input,init){
    var url=typeof input==='string'?input:(input&&input.url)||'';
    var result=origFetch(input,init);
    if(url.indexOf('sefaria.org/api/texts/')<0) return result;
    var dec=decodeURIComponent(url);
    if(dec.indexOf('Rashi on ')>=0||dec.indexOf('Tosafot on ')>=0||dec.indexOf('Bartenura on ')>=0) return result;

    result.then(function(r){return r.clone().json();}).then(function(data){
      var m=url.match(/\/api\/texts\/([^?]+)/); if(!m) return;
      var ref=decodeURIComponent(m[1]);
      if(ref===lastRef) return;
      lastRef=ref;
      setTimeout(ensureToggle,500);

      /* Talmud */
      if(url.indexOf('versionTitle')>=0){
        var parts=ref.split('.'),masechet=parts[0],daf=parts[1];
        if(!masechet||!daf) return;
        setTimeout(function(){
          document.querySelectorAll('.mkd-block').forEach(function(el){el.remove();});
          var sc=getScroll(); if(!sc) return;
          fetchComm('Rashi on '+masechet+'.'+daf,function(d){
            if(!d) return; var e=flat(d.he); if(!e.length) return;
            var b=buildBlock(e,'\u05e8\u05e9\u05d9'); if(!rashiOn)b.style.display='none'; sc.appendChild(b);
          });
          fetchComm('Tosafot on '+masechet+'.'+daf,function(d){
            if(!d) return; var e=flat(d.he); if(!e.length) return;
            var b=buildBlock(e,'\u05ea\u05d5\u05e1\u05e4\u05d5\u05ea'); if(!rashiOn)b.style.display='none'; sc.appendChild(b);
          });
        },300);
        return;
      }

      /* Mishnah */
      if(ref.indexOf('Mishnah ')===0){
        setTimeout(function(){inject('Bartenura on '+ref,'\u05e8\u05e2\u05d1');},600);
        return;
      }

      /* Tanach */
      var cats=(data.categories)||[];
      if(cats.indexOf('Tanakh')>=0||cats.indexOf('Torah')>=0||cats.indexOf('Prophets')>=0||cats.indexOf('Writings')>=0){
        setTimeout(function(){inject('Rashi on '+ref,'\u05e8\u05e9\u05d9');},600);
      }
    }).catch(function(){});
    return result;
  };

  new MutationObserver(function(){
    var has=false;
    document.querySelectorAll('button').forEach(function(b){if(b.textContent.indexOf('Translation')>=0)has=true;});
    if(!has){document.querySelectorAll('.mkd-toggle').forEach(function(el){el.remove();});lastRef=null;}
  }).observe(document.body,{childList:true,subtree:true});

})();



/* ── Hebcal Tehillim fetcher ── */
(function() {
  var today = new Date().toDateString();
  try {
    var c = localStorage.getItem('mkdsh_tehillim_hebcal');
    if (c) { var p = JSON.parse(c); if (p.date === today) return; }
  } catch(e) {}

  var d = new Date();
  var ds = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');

  /* Step 1: get Hebrew date from Hebcal converter */
  fetch('https://www.hebcal.com/converter?cfg=json&gy='+d.getFullYear()+'&gm='+(d.getMonth()+1)+'&gd='+d.getDate()+'&g2h=1')
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(hdate) {
      if (!hdate) return;
      var heDay = hdate.hd; /* Hebrew day of month 1-30 */

      /* 30-day Tehillim cycle (standard) */
      var cycle = [[1,9],[10,17],[18,22],[23,28],[29,34],[35,38],[39,43],[44,48],
                   [49,54],[55,59],[60,65],[66,68],[69,71],[72,76],[77,79],[80,82],
                   [83,87],[88,89],[90,96],[97,103],[104,105],[106,107],[108,112],
                   [113,118],[119,119],[120,134],[135,139],[140,144],[145,150],[1,150]];
      var pair = cycle[Math.min(heDay-1, 29)];
      var from = pair[0], to = pair[1];
      var label = (from === to) ? String(from) : from + '\u2013' + to;
      var heMonthName = hdate.heDateParts ? hdate.heDateParts.m : '';
      var stored = {
        date: today, from: from, to: to, label: label,
        en: 'Psalms ' + label,
        he: '\u05ea\u05d4\u05dc\u05d9\u05dd ' + label,
        heDay: heDay
      };
      localStorage.setItem('mkdsh_tehillim_hebcal', JSON.stringify(stored));

      /* Also store in the format te() checks */
      localStorage.setItem('mkdsh_tehillim_today', JSON.stringify(stored));

      /* Update home screen if visible */
      setTimeout(function() {
        document.querySelectorAll('div').forEach(function(el) {
          if (el.childNodes.length === 1 && el.textContent.trim() === 'Daily Tehillim') {
            var row = el.closest('[style]') || el.parentNode;
            if (row) {
              var enEl = row.querySelector('div:last-child div') || row.querySelector('div + div');
              if (enEl && enEl !== el) enEl.textContent = stored.en;
            }
          }
        });
      }, 800);
    })
    .catch(function() {});
})();
