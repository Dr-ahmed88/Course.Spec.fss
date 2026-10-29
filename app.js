(() => {
  'use strict';
  const categories = [
    {key:'courses',label:'المقررات الدراسية',singular:'المقرر',icon:'م',desc:'قائمة المقررات المستخرجة من توصيف البرنامج، مع بيانات الفرقة والساعات والتصنيف.'},
    {key:'standards',label:'المعايير الأكاديمية',singular:'المعيار',icon:'ع',desc:'المعايير القومية الأكاديمية القياسية ومؤشراتها.'},
    {key:'program_outcomes',label:'نواتج تعلم البرنامج',singular:'ناتج البرنامج',icon:'ب',desc:'نواتج تعلم البرنامج وأكوادها ومجالاتها.'},
    {key:'course_outcomes',label:'نواتج تعلم المقرر',singular:'ناتج المقرر',icon:'ن',desc:'نواتج التعلم المقترحة أو المعتمدة لكل مقرر.'},
    {key:'course_contents',label:'المحتوى العلمي',singular:'موضوع محتوى',icon:'ح',desc:'الموضوعات والوحدات العلمية وتوزيعها على المقرر.'},
    {key:'teaching_methods',label:'استراتيجيات التدريس',singular:'استراتيجية تدريس',icon:'ت',desc:'طرق واستراتيجيات التدريس والتعلم.'},
    {key:'assessment_methods',label:'أساليب التقييم',singular:'أسلوب تقييم',icon:'ق',desc:'أدوات التقييم وتوزيعها على نواتج التعلم.'},
    {key:'mappings',label:'مصفوفات الربط',singular:'عملية ربط',icon:'↔',desc:'ربط المعايير بنواتج البرنامج، وربط نواتج البرنامج بالمقررات ونواتج المقرر بالمحتوى والتدريس والتقييم.'},
    {key:'institution_info',label:'الرؤية والرسالة والبيانات',singular:'بيان مؤسسي',icon:'ر',desc:'الرؤية والرسالة والأهداف والبيانات المرجعية للكلية والبرنامج.'}
  ];
  const $ = id => document.getElementById(id);
  let supabase = null, cloudMode = false, user = null, isAdmin = false, currentCategory = 'courses', editingId = null;
  let demoRecords = JSON.parse(localStorage.getItem('courseSpecDemoRecords') || 'null');
  if (!demoRecords) { demoRecords = []; localStorage.setItem('courseSpecDemoRecords', JSON.stringify(demoRecords)); }
  const seedDemo = () => {
    if (demoRecords.length) return;
    const seed = [
      {category:'courses',title:'مقرر تجريبي — يُستبدل ببيانات اللائحة',code:'DEMO101',description:'هذا سجل توضيحي فقط وليس اسم مقرر رسميًا من توصيف البرنامج.',data:{level:'الفرقة الأولى',hours:2,mandatory:true}},
      {category:'program_outcomes',title:'مثال توضيحي لناتج تعلم البرنامج',code:'A1',description:'أدخل النص الرسمي لناتج التعلم كما ورد في ملف توصيف البرنامج.',data:{domain:'المعرفة والفهم',source:'توصيف البرنامج'}},
      {category:'standards',title:'المعيار الأكاديمي — بيانات مطلوبة',code:'STD-01',description:'أدخل نص المعيار ومؤشراته من ملف المعايير القومية.',data:{source:'المعايير القومية الأكاديمية القياسية'}}
    ];
    demoRecords = seed.map(x=>({...x,id:crypto.randomUUID(),created_at:new Date().toISOString(),updated_at:new Date().toISOString()}));
    saveDemo();
  };
  const saveDemo = () => localStorage.setItem('courseSpecDemoRecords', JSON.stringify(demoRecords));
  const category = key => categories.find(c=>c.key===key) || categories[0];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const getRecords = async (cat=currentCategory) => {
    if (!cloudMode) return demoRecords.filter(r=>r.category===cat).sort((a,b)=>String(a.title).localeCompare(String(b.title),'ar'));
    const {data,error}=await supabase.from('app_records').select('*').eq('category',cat).order('title');
    if(error) throw error; return data||[];
  };
  const getAll = async () => {
    if (!cloudMode) return demoRecords;
    const {data,error}=await supabase.from('app_records').select('id,category,title,code,description,data'); if(error) throw error; return data||[];
  };
  const upsert = async record => {
    if (!cloudMode) {
      if(record.id){const i=demoRecords.findIndex(x=>x.id===record.id);if(i>=0)demoRecords[i]={...demoRecords[i],...record,updated_at:new Date().toISOString()};}
      else demoRecords.push({...record,id:crypto.randomUUID(),created_at:new Date().toISOString(),updated_at:new Date().toISOString()});
      saveDemo(); return;
    }
    const payload={category:record.category,title:record.title,code:record.code||'',description:record.description||'',data:record.data||{},updated_at:new Date().toISOString()};
    if(record.id) payload.id=record.id;
    const {error}=await supabase.from('app_records').upsert(payload); if(error) throw error;
  };
  const removeRecord = async id => {
    if (!cloudMode) { demoRecords=demoRecords.filter(r=>r.id!==id); saveDemo(); return; }
    const {error}=await supabase.from('app_records').delete().eq('id',id); if(error) throw error;
  };
  function setMessage(el, text, good=false){el.textContent=text;el.style.color=good?'#287447':'var(--red)';}
  function renderNav(counts={}) {
    $('categoryNav').innerHTML=categories.map(c=>`<button class="nav-item ${c.key===currentCategory?'active':''}" data-cat="${c.key}"><span>${c.icon} &nbsp; ${esc(c.label)}</span><small>${counts[c.key]||0}</small></button>`).join('');
    $('categoryNav').querySelectorAll('[data-cat]').forEach(b=>b.addEventListener('click',()=>{currentCategory=b.dataset.cat;render();}));
  }
  async function render() {
    try {
      const all=await getAll(); const counts={}; categories.forEach(c=>counts[c.key]=all.filter(r=>r.category===c.key).length);
      renderNav(counts); $('totalCount').textContent=all.length; $('coursesCount').textContent=counts.courses||0; $('outcomesCount').textContent=counts.program_outcomes||0; $('mappingsCount').textContent=counts.mappings||0;
      const c=category(currentCategory); $('sectionTitle').textContent=c.label; $('sectionDesc').textContent=c.desc;
      const query=$('searchInput').value.trim().toLocaleLowerCase('ar'); const records=(await getRecords(currentCategory)).filter(r=>`${r.title||''} ${r.code||''} ${r.description||''} ${JSON.stringify(r.data||{})}`.toLocaleLowerCase('ar').includes(query));
      $('recordsList').innerHTML=records.map(r=>`<article class="record-card"><div class="record-icon">${esc(c.icon)}</div><div class="record-main"><h3>${esc(r.title)}</h3>${r.code?`<span class="record-code">${esc(r.code)}</span>`:''}<p>${esc(r.description||'لا يوجد وصف مختصر.')}</p>${r.data&&Object.keys(r.data).length?`<p><strong>تفاصيل:</strong> ${esc(Object.entries(r.data).map(([k,v])=>`${k}: ${typeof v==='object'?JSON.stringify(v):v}`).join(' · '))}</p>`:''}</div><div class="record-actions"><button class="small-btn" data-edit="${esc(r.id)}">تعديل</button><button class="small-btn delete" data-delete="${esc(r.id)}">حذف</button></div></article>`).join('');
      $('emptyState').classList.toggle('hidden',records.length>0); $('recordsList').classList.toggle('hidden',records.length===0);
      $('recordsList').querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>openEdit(records.find(r=>r.id===b.dataset.edit))));
      $('recordsList').querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',async()=>{const rec=records.find(r=>r.id===b.dataset.delete);if(!confirm(`هل تريد حذف السجل «${rec?.title||''}» نهائيًا؟`))return;try{await removeRecord(b.dataset.delete);setMessage($('sectionMessage'),'تم حذف السجل.',true);await render();}catch(e){setMessage($('sectionMessage'),'تعذر الحذف: '+e.message);}}));
      $('addBtn').textContent=`＋ إضافة ${c.singular}`; setMessage($('sectionMessage'),'');
    } catch(e){setMessage($('sectionMessage'),'تعذر تحميل البيانات. تحقق من إعدادات قاعدة البيانات والصلاحيات: '+e.message);}
  }
  function openEdit(rec=null){editingId=rec?.id||null;$('dialogTitle').textContent=rec?`تعديل ${category(currentCategory).singular}`:`إضافة ${category(currentCategory).singular}`;$('recordTitle').value=rec?.title||'';$('recordCode').value=rec?.code||'';$('recordDescription').value=rec?.description||'';$('recordExtra').value=JSON.stringify(rec?.data||{},null,2);$('formError').textContent='';$('recordDialog').showModal();}
  async function login(email,password){
    if(!cloudMode){ user={email,local:true}; isAdmin=true; enterApp(true); return; }
    const {data,error}=await supabase.auth.signInWithPassword({email,password}); if(error) throw error;
    user=data.user; const {data:role,error:roleError}=await supabase.from('user_roles').select('role').eq('user_id',user.id).maybeSingle();
    if(roleError||!role||role.role!=='admin'){await supabase.auth.signOut();throw new Error('هذا الحساب غير مسجل كمسؤول. اطلب من مدير قاعدة البيانات منحه دور admin.');}
    isAdmin=true; enterApp(false);
  }
  function enterApp(demo){$('loginView').classList.add('hidden');$('appView').classList.remove('hidden');$('logoutBtn').classList.remove('hidden');$('roleLabel').textContent=demo?'مسؤول تجريبي — بيانات محلية':'مسؤول النظام';$('modeBadge').textContent=demo?'وضع تجريبي محلي':'متصل بقاعدة البيانات';$('demoNotice').classList.toggle('hidden',cloudMode);render();}
  async function logout(){if(cloudMode&&supabase)await supabase.auth.signOut();user=null;isAdmin=false;$('appView').classList.add('hidden');$('loginView').classList.remove('hidden');$('logoutBtn').classList.add('hidden');$('password').value='';}
  function init(){
    const url=window.COURSE_APP_SUPABASE_URL, key=window.COURSE_APP_SUPABASE_KEY;
    if(url&&key&&window.supabase){try{supabase=window.supabase.createClient(url,key);cloudMode=true;$('modeBadge').textContent='قاعدة بيانات سحابية';$('demoNotice').classList.add('hidden');}catch(e){console.error(e);}}
    if(!cloudMode){seedDemo();$('demoNotice').classList.remove('hidden');}
    $('loginForm').addEventListener('submit',async e=>{e.preventDefault();setMessage($('loginMessage'),'جارٍ التحقق...');try{await login($('email').value.trim(),$('password').value);}catch(err){setMessage($('loginMessage'),err.message||'تعذر تسجيل الدخول.');}});
    $('logoutBtn').addEventListener('click',logout);$('addBtn').addEventListener('click',()=>openEdit());$('refreshBtn').addEventListener('click',render);$('searchInput').addEventListener('input',render);
    $('closeDialog').addEventListener('click',()=>$('recordDialog').close());$('cancelDialog').addEventListener('click',()=>$('recordDialog').close());
    $('recordForm').addEventListener('submit',async e=>{e.preventDefault();let data;try{data=JSON.parse($('recordExtra').value||'{}');if(data===null||Array.isArray(data)||typeof data!=='object')throw new Error('يجب أن تكون البيانات الإضافية كائن JSON.');}catch(err){$('formError').textContent='صيغة JSON غير صحيحة: '+err.message;return;}
      try{await upsert({id:editingId,category:currentCategory,title:$('recordTitle').value.trim(),code:$('recordCode').value.trim(),description:$('recordDescription').value.trim(),data});$('recordDialog').close();setMessage($('sectionMessage'),'تم حفظ السجل بنجاح.',true);await render();}catch(err){$('formError').textContent='تعذر الحفظ: '+err.message;}});
  }
  init();
})();
