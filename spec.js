(() => {
  'use strict';
  const D = window.COURSE_DATA;
  if (!D) return;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const KEY = 'courseSpecEditsV1', PKEY = 'courseSpecProgramEditsV1';
  const yearName = {1:'الأولى',2:'الثانية',3:'الثالثة',4:'الرابعة'};
  const semName = {1:'الأول',2:'الثاني'};
  const domOrder = ['A','B','C','D'];
  const canEdit = () => document.body.dataset.role === 'admin';
  const load = (k, def) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || def; } catch (e) { return def; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  let edits = load(KEY, {});
  let pedits = load(PKEY, {edited:{}, added:[], deleted:[]});
  const basePlos = D.plos.map(p => ({...p}));
  let ploByCode = {};
  const codeNum = c => parseInt(c.slice(1), 10) || 0;

  // ---- نواتج البرنامج بعد التعديلات ----
  function applyProgramEdits() {
    const list = basePlos.filter(p => !pedits.deleted.includes(p.code)).concat(pedits.added.map(p => ({...p, custom:true})));
    list.forEach(p => { if (pedits.edited[p.code] !== undefined) p.text = pedits.edited[p.code]; });
    list.sort((a,b) => a.code[0].localeCompare(b.code[0]) || codeNum(a.code) - codeNum(b.code));
    D.plos = list; ploByCode = Object.fromEntries(list.map(p => [p.code, p]));
    D.courses.forEach(c => { c.plos = (c.basePlos ||= [...c.plos]).filter(x => ploByCode[x]); c.suggested = suggestPlos(c); });
  }
  const savePedits = () => save(PKEY, pedits);

  // ---- اقتراح الربط (قواعد بسيطة وشفافة؛ للمراجعة العلمية) ----
  function suggestPlos(c) {
    const n = c.name, s = new Set();
    const has = (...w) => w.some(x => n.includes(x));
    const skillDept = /ع\.ق|ج\.ت\.ع|ج\.م|م\.م/.test(c.code) && c.practical > 0 && !has('اختياري','ألعاب تمهيدية');
    if (skillDept) ['C1','C11','B10','A6'].forEach(x => s.add(x));
    if (has('اختياري')) ['C1','C2','C4','B4','B10'].forEach(x => s.add(x));
    if (has('تربية عملية','تدريب ميداني')) ['B7','B9','C2','C3','C4','C5','C8','C11','D1','D2','D7'].forEach(x => s.add(x));
    if (has('تقويم','قياس')) ['B1','B11','C3','C9'].forEach(x => s.add(x));
    if (has('البحث العلمي','الاحصاء')) ['C12','D3','D4','B1'].forEach(x => s.add(x));
    if (has('تكنولوجيا التعليم')) ['C10','D3','D4','B3'].forEach(x => s.add(x));
    if (has('حاسب')) ['D3','D4'].forEach(x => s.add(x));
    if (has('انجليزية')) s.add('D8');
    if (has('لغة عربية')) s.add('D4');
    if (has('تخطيط')) s.add('B4');
    if (has('إدارة','الجودة والاعتماد','المنافسات')) ['B5','C5','C6','D7'].forEach(x => s.add(x));
    if (has('طرق التدريب','طرق وأساليب','مناهج')) ['B3','B4','B7'].forEach(x => s.add(x));
    if (has('نفس','الصحة','صحة','إصابات','ترويح','اجتماع')) s.add('B6');
    if (has('إصابات','اسعافات')) ['C8','C11'].forEach(x => s.add(x));
    if (has('تربية حركية','قصة حركية','ألعاب تمهيدية')) ['B9','C2'].forEach(x => s.add(x));
    if (has('بحث')) s.add('D6');
    c.plos.forEach(x => s.delete(x));
    return [...s].filter(x => ploByCode[x]);
  }
  function pickStrategies(sel) {
    const S = new Set(sel);
    return D.strategies.map(s => ({id:s.id, hit:s.plos.filter(x => S.has(x)).length, size:s.plos.length}))
      .filter(x => x.hit >= 2 && x.size <= 40)
      .sort((a,b) => b.hit - a.hit || (b.hit/b.size) - (a.hit/a.size)).slice(0,6).map(x => x.id);
  }
  function pickAssess(c, sel) {
    const dom = new Set(sel.map(x => x[0])), n = c.name, out = new Set(['التقييم المستمر']);
    const field = n.includes('تدريب ميداني') || n.includes('تربية عملية');
    if (dom.has('A')) { out.add('الاختبارات التحريرية'); out.add('الاختبارات الشفوية'); }
    if (dom.has('C') || c.practical > 0) { out.add('الاختبارات العملية والتطبيقية'); out.add('التقييم القائم على الأداء'); }
    if (dom.has('B')) out.add('دراسة الحالات وحل المشكلات');
    if (dom.has('D')) out.add('العروض التقديمية والمناقشات');
    if (field) { out.add('تقييم التدريب الميداني'); out.add('ملف الإنجاز (Portfolio)'); }
    return D.assessments.map((a,i) => [a.name,i]).filter(([nm]) => out.has(nm)).map(([,i]) => i);
  }
  const cloText = (c, code) => `${ploByCode[code].text.replace(/[.\s]+$/,'')} من خلال دراسة مقرر «${c.name}».`;
  const origin = (c, code) => c.plos.includes(code) ? 'matrix' : (c.suggested.includes(code) ? 'sug' : 'man');
  const originLabel = {matrix:'من مصفوفة التوصيف', sug:'مقترح للمراجعة', man:'مضاف يدويًا'};

  function state(c) {
    if (!edits[c.id]) edits[c.id] = {};
    const e = edits[c.id];
    if (!e.sel) e.sel = [...c.plos, ...c.suggested];
    e.sel = e.sel.filter(x => ploByCode[x]);
    if (!e.clos) e.clos = {};
    if (!e.cloEdited) { e.cloEdited = {}; Object.keys(e.clos).forEach(k => { if (ploByCode[k] && e.clos[k] !== cloText(c, k)) e.cloEdited[k] = true; }); }
    if (!e.custom) e.custom = [];
    if (!e.strat) e.strat = pickStrategies(e.sel);
    if (!e.assess) e.assess = pickAssess(c, e.sel);
    return e;
  }

  // ---- واجهة المقرر ----
  let cur = D.courses[0];
  function buildSelect() {
    let html = '', last = '';
    D.courses.forEach(c => {
      const g = `الفرقة ${yearName[c.year]} — الفصل ${semName[c.sem]}`;
      if (g !== last) { if (last) html += '</optgroup>'; html += `<optgroup label="${g}">`; last = g; }
      html += `<option value="${c.id}">${esc(c.code)} — ${esc(c.name)}</option>`;
    });
    $('courseSelect').innerHTML = html + '</optgroup>';
    $('courseSelect').value = cur.id;
  }
  function renderSpec() {
    const c = cur, e = state(c), sel = new Set(e.sel), ed = canEdit();
    const domainBlocks = domOrder.map(d => {
      const codes = D.plos.filter(p => p.code[0] === d && sel.has(p.code)).map(p => p.code);
      const customs = e.custom.filter(x => x.domain === d);
      const addBtn = `<div class="add-line no-print admin-only"><button class="mini" data-addclo="${d}">＋ إضافة ناتج مقرر في هذا المجال</button></div>`;
      if (!codes.length && !customs.length) return `<h4>${D.domains[d]} (${d})</h4><p class="muted-s no-print">لا توجد نواتج في هذا المجال.</p>${addBtn}`;
      let i = 0;
      const rows = codes.map(code => {
        const o = origin(c, code); i++;
        const txt = e.cloEdited[code] ? e.clos[code] : cloText(c, code);
        return `<tr><td class="c-id">${d.toLowerCase()}${i}</td><td><div class="editable" contenteditable="${ed}" data-clo="${code}">${esc(txt)}</div></td><td class="c-plo">${code}<span class="tag ${o} no-print">${originLabel[o]}</span></td></tr>`;
      }).join('') + customs.map(x => { i++; return `<tr><td class="c-id">${d.toLowerCase()}${i}</td><td><div class="editable" contenteditable="${ed}" data-custom="${x.id}">${esc(x.text)}</div></td><td class="c-plo">${x.plo ? esc(x.plo) : '—'}<span class="tag man no-print">ناتج مضاف</span><button class="mini del admin-only no-print" data-delclo="${x.id}">حذف</button></td></tr>`; }).join('');
      return `<h4>${D.domains[d]} (${d})</h4><table class="spec-table"><thead><tr><th style="width:60px">الرمز</th><th>ناتج التعلم المستهدف للمقرر</th><th style="width:150px">ناتج البرنامج المرتبط</th></tr></thead><tbody>${rows}</tbody></table>${addBtn}`;
    }).join('');
    const strat = D.strategies.filter(s => e.strat.includes(s.id));
    const ass = e.assess.map(i => D.assessments[i]);
    $('specDoc').innerHTML = `
      <div class="doc-head"><div>${esc(D.program.university)}<br>${esc(D.program.faculty)}<br>وحدة ضمان الجودة والتطوير المستمر</div><div class="doc-title"><strong>توصيف مقرر دراسي</strong><br>${esc(D.program.name)}</div><div>العام الدراسي: ................</div></div>
      <h3>1. معلومات المقرر</h3>
      <table class="spec-table kv"><tbody>
        <tr><th>اسم المقرر</th><td>${esc(c.name)}</td><th>رمز المقرر</th><td>${esc(c.code)}</td></tr>
        <tr><th>الفرقة / الفصل</th><td>الفرقة ${yearName[c.year]} — الفصل الدراسي ${semName[c.sem]}</td><th>نوع المقرر</th><td>${esc(c.type)} (متطلب ${esc(c.req)})</td></tr>
        <tr><th>الساعات المعتمدة</th><td>${c.credits}</td><th>الساعات الأسبوعية</th><td>نظري: ${c.theory} — عملي: ${c.practical}</td></tr>
        <tr><th>القسم المسؤول</th><td colspan="3">${esc(c.dept)}</td></tr>
        <tr><th>البرنامج</th><td colspan="3">${esc(D.program.name)} — المعايير المتبناة: ${esc(D.program.standards)}</td></tr>
      </tbody></table>
      <h3>2. هدف المقرر</h3>
      <div class="editable block" contenteditable="${ed}" data-field="aims" data-ph="اكتب هدف المقرر هنا...">${esc(e.aims||'')}</div>
      <h3>3. نواتج التعلم المستهدفة للمقرر</h3>
      <p class="muted-s">في نهاية المقرر يكون الطالب قادرًا على أن:</p>
      ${domainBlocks}
      <h3>4. المحتوى العلمي</h3>
      <div class="editable block tall" contenteditable="${ed}" data-field="content" data-ph="أدخل موضوعات المقرر وتوزيعها الأسبوعي (غير متوفرة في الملفات المرفقة)...">${esc(e.content||'')}</div>
      <h3>5. استراتيجيات التعليم والتعلم</h3>
      ${strat.length ? '<ul>'+strat.map(s => `<li>${esc(s.name)}</li>`).join('')+'</ul>' : '<p class="muted-s">لم تُحدد.</p>'}
      <h3>6. أساليب تقييم الطلاب</h3>
      ${ass.length ? `<table class="spec-table"><thead><tr><th>أسلوب التقييم</th><th>آلية التقييم</th></tr></thead><tbody>${ass.map(a => `<tr><td>${esc(a.name)}</td><td>${esc(a.how)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted-s">لم تُحدد.</p>'}
      <div class="sign"><div>منسق البرنامج<br><strong>${esc(D.program.coordinator)}</strong><br>التوقيع: ...........</div><div>مسؤول المقرر<br><br>التوقيع: ...........</div><div>رئيس القسم<br><br>التوقيع: ...........</div></div>`;
    const root = $('specDoc');
    root.querySelectorAll('[data-clo]').forEach(el => el.addEventListener('input', () => { e.clos[el.dataset.clo] = el.innerText.trim(); e.cloEdited[el.dataset.clo] = true; save(KEY, edits); }));
    root.querySelectorAll('[data-custom]').forEach(el => el.addEventListener('input', () => { const x = e.custom.find(z => z.id === el.dataset.custom); if (x) { x.text = el.innerText.trim(); save(KEY, edits); } }));
    root.querySelectorAll('[data-field]').forEach(el => el.addEventListener('input', () => { e[el.dataset.field] = el.innerText.trim(); save(KEY, edits); }));
    root.querySelectorAll('[data-addclo]').forEach(b => b.addEventListener('click', () => openOutcome({kind:'clo', domain:b.dataset.addclo})));
    root.querySelectorAll('[data-delclo]').forEach(b => b.addEventListener('click', () => { if (!confirm('حذف هذا الناتج؟')) return; e.custom = e.custom.filter(z => z.id !== b.dataset.delclo); save(KEY, edits); renderSpec(); }));
    renderPanel(); save(KEY, edits);
  }
  function renderPanel() {
    const c = cur, e = state(c), sel = new Set(e.sel);
    $('mapPanel').innerHTML = domOrder.map(d => `<fieldset><legend>${D.domains[d]}</legend>${D.plos.filter(p => p.code[0] === d).map(p => {
      const o = origin(c, p.code);
      return `<label class="chk"><input type="checkbox" data-plo="${p.code}" ${sel.has(p.code)?'checked':''}> <b>${p.code}</b> ${esc(p.text)} ${o!=='man'?`<span class="tag ${o}">${originLabel[o]}</span>`:''}</label>`;
    }).join('')}</fieldset>`).join('');
    $('mapPanel').querySelectorAll('[data-plo]').forEach(i => i.addEventListener('change', () => {
      const s = new Set(e.sel); i.checked ? s.add(i.dataset.plo) : s.delete(i.dataset.plo);
      e.sel = D.plos.map(p => p.code).filter(x => s.has(x)); e.strat = pickStrategies(e.sel); e.assess = pickAssess(c, e.sel);
      renderSpec();
    }));
    $('stratPanel').innerHTML = D.strategies.map(s => `<label class="chk"><input type="checkbox" data-st="${s.id}" ${e.strat.includes(s.id)?'checked':''}> ${esc(s.name)}</label>`).join('');
    $('stratPanel').querySelectorAll('[data-st]').forEach(i => i.addEventListener('change', () => { const id = +i.dataset.st; e.strat = i.checked ? [...new Set([...e.strat,id])] : e.strat.filter(x => x!==id); renderSpec(); }));
    $('assessPanel').innerHTML = D.assessments.map((a,k) => `<label class="chk"><input type="checkbox" data-as="${k}" ${e.assess.includes(k)?'checked':''}> ${esc(a.name)}</label>`).join('');
    $('assessPanel').querySelectorAll('[data-as]').forEach(i => i.addEventListener('change', () => { const k = +i.dataset.as; e.assess = i.checked ? [...new Set([...e.assess,k])].sort((a,b)=>a-b) : e.assess.filter(x => x!==k); renderSpec(); }));
  }

  // ---- تبويب نواتج البرنامج (إضافة / تعديل / حذف) ----
  function renderProgram() {
    const cover = {}; D.plos.forEach(p => cover[p.code] = {m:[], s:[]});
    D.courses.forEach(c => { c.plos.forEach(x => cover[x] && cover[x].m.push(c)); c.suggested.forEach(x => cover[x] && cover[x].s.push(c)); });
    const totals = domOrder.map(d => { const ps = D.plos.filter(p => p.code[0]===d); return {d, n:ps.length, m:ps.filter(p => cover[p.code].m.length).length, ms:ps.filter(p => cover[p.code].m.length || cover[p.code].s.length).length}; });
    $('programBox').innerHTML = `
      <div class="notice"><strong>حالة مصفوفة التوصيف الحالية:</strong> ${totals.map(t => `${D.domains[t.d]}: ${t.m} من ${t.n} ناتج مغطى في المصفوفة (${t.ms} مع الاقتراحات)`).join(' — ')}. النواتج غير المغطاة تحتاج استكمالًا من لجنة البرنامج؛ الاقتراحات الآلية للمراجعة فقط.</div>
      ${domOrder.map(d => `<h3>${D.domains[d]} (${d}) <button class="mini admin-only" data-addplo="${d}">＋ إضافة ناتج</button></h3><table class="spec-table"><thead><tr><th style="width:55px">الرمز</th><th>ناتج التعلم المستهدف للبرنامج</th><th style="width:100px">مقررات (مصفوفة)</th><th style="width:100px">مقررات (مقترحة)</th><th style="width:120px" class="admin-only">إجراءات</th></tr></thead><tbody>${D.plos.filter(p => p.code[0]===d).map(p => `<tr><td><b>${p.code}</b>${p.custom?'<br><span class="tag man">مضاف</span>':''}${pedits.edited[p.code]!==undefined&&!p.custom?'<br><span class="tag sug">معدّل</span>':''}</td><td>${esc(p.text)}</td><td>${cover[p.code].m.length ? `<details><summary>${cover[p.code].m.length}</summary>${cover[p.code].m.map(c => esc(c.name)).join('<br>')}</details>` : '<span class="tag man">لا يوجد</span>'}</td><td>${cover[p.code].s.length ? `<details><summary>${cover[p.code].s.length}</summary>${cover[p.code].s.map(c => esc(c.name)).join('<br>')}</details>` : '—'}</td><td class="admin-only"><button class="mini" data-editplo="${p.code}">تعديل</button><button class="mini del" data-delplo="${p.code}">حذف</button></td></tr>`).join('')}</tbody></table>`).join('')}
      <h3>مؤشرات قياس أداء البرنامج</h3><table class="spec-table"><thead><tr><th>المؤشر</th><th>المستهدف</th><th>طريقة القياس</th><th>التوقيت</th></tr></thead><tbody>${D.kpis.map(k => `<tr><td>${esc(k.name)}</td><td>${esc(k.target)}</td><td>${esc(k.method)}</td><td>${esc(k.timing)}</td></tr>`).join('')}</tbody></table>`;
    const box = $('programBox');
    box.querySelectorAll('[data-addplo]').forEach(b => b.addEventListener('click', () => openOutcome({kind:'plo', domain:b.dataset.addplo})));
    box.querySelectorAll('[data-editplo]').forEach(b => b.addEventListener('click', () => openOutcome({kind:'plo', code:b.dataset.editplo})));
    box.querySelectorAll('[data-delplo]').forEach(b => b.addEventListener('click', () => {
      const code = b.dataset.delplo;
      if (!confirm(`حذف الناتج ${code} من البرنامج؟ سيُزال ربطه بالمقررات أيضًا.`)) return;
      if (pedits.added.some(p => p.code === code)) pedits.added = pedits.added.filter(p => p.code !== code); else if (!pedits.deleted.includes(code)) pedits.deleted.push(code);
      delete pedits.edited[code]; refreshAll();
    }));
  }
  function refreshAll() { savePedits(); applyProgramEdits(); renderProgram(); renderSpec(); }

  // ---- نافذة إضافة / تعديل ناتج ----
  let ocCtx = null;
  function openOutcome(ctx) {
    ocCtx = ctx; $('ocError').textContent = '';
    $('ocDomain').innerHTML = domOrder.map(d => `<option value="${d}">${D.domains[d]} (${d})</option>`).join('');
    const isPlo = ctx.kind === 'plo', editing = isPlo && ctx.code;
    $('ocTitle').textContent = isPlo ? (editing ? `تعديل الناتج ${ctx.code}` : 'إضافة ناتج تعلم للبرنامج') : `إضافة ناتج لمقرر «${cur.name}»`;
    $('ocDomain').value = editing ? ctx.code[0] : ctx.domain; $('ocDomain').disabled = !!editing;
    $('ocCodeRow').classList.toggle('hidden', !isPlo || !!editing);
    $('ocPloRow').classList.toggle('hidden', isPlo);
    if (isPlo && !editing) $('ocCode').value = nextCode(ctx.domain);
    $('ocText').value = editing ? ploByCode[ctx.code].text : '';
    const fillPlo = () => { $('ocPlo').innerHTML = '<option value="">— بدون ربط —</option>' + D.plos.filter(p => p.code[0] === $('ocDomain').value).map(p => `<option value="${p.code}">${p.code} — ${esc(p.text.slice(0,70))}</option>`).join(''); };
    fillPlo(); $('ocDomain').onchange = () => { fillPlo(); if (isPlo && !editing) $('ocCode').value = nextCode($('ocDomain').value); };
    $('outcomeDialog').showModal();
  }
  const nextCode = d => d + (Math.max(0, ...D.plos.filter(p => p.code[0] === d).map(p => codeNum(p.code))) + 1);
  function submitOutcome(ev) {
    ev.preventDefault();
    const text = $('ocText').value.trim(), d = $('ocDomain').value;
    if (!text) { $('ocError').textContent = 'نص الناتج مطلوب.'; return; }
    if (ocCtx.kind === 'plo') {
      if (ocCtx.code) { pedits.edited[ocCtx.code] = text; const a = pedits.added.find(p => p.code === ocCtx.code); if (a) a.text = text; }
      else {
        const code = $('ocCode').value.trim().toUpperCase();
        if (!/^[ABCD]\d{1,2}$/.test(code) || code[0] !== d) { $('ocError').textContent = 'الرمز يجب أن يبدأ بحرف المجال ويتبعه رقم، مثل ' + nextCode(d); return; }
        if (ploByCode[code]) { $('ocError').textContent = 'هذا الرمز مستخدم بالفعل.'; return; }
        pedits.deleted = pedits.deleted.filter(x => x !== code);
        pedits.added.push({code, domain:d, text});
      }
      $('outcomeDialog').close(); refreshAll();
    } else {
      const e = state(cur); e.custom.push({id:'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,5), domain:d, text, plo:$('ocPlo').value});
      $('outcomeDialog').close(); renderSpec();
    }
  }

  // ---- قراءة الملفات (zip / docx / xlsx) بدون مكتبات خارجية ----
  async function readZip(buf) {
    const dv = new DataView(buf), u8 = new Uint8Array(buf);
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 70000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('الملف ليس بصيغة docx/xlsx صالحة (أو أنه صيغة قديمة .doc/.xls غير مدعومة).');
    const n = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true);
    const files = {};
    for (let k = 0; k < n; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
      const nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
      const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nl));
      const lnl = dv.getUint16(off + 26, true), lel = dv.getUint16(off + 28, true), start = off + 30 + lnl + lel;
      files[name] = async () => {
        const raw = u8.subarray(start, start + csize);
        if (method === 0) return new TextDecoder().decode(raw);
        const ds = new DecompressionStream('deflate-raw');
        const out = await new Response(new Blob([raw]).stream().pipeThrough(ds)).arrayBuffer();
        return new TextDecoder().decode(out);
      };
      p += 46 + nl + el + cl;
    }
    return files;
  }
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const xml = s => new DOMParser().parseFromString(s, 'application/xml');
  const kids = (el, ln) => [...el.children].filter(x => x.localName === ln);
  function paraText(p) { let t = ''; const walk = n => { for (const ch of n.childNodes) { if (ch.nodeType !== 1) continue; if (ch.localName === 't') t += ch.textContent; else if (ch.localName === 'tab') t += ' '; else if (ch.localName === 'br') t += ' '; else walk(ch); } }; walk(p); return t.replace(/\s+/g, ' ').trim(); }
  async function parseDocx(buf) {
    const z = await readZip(buf); if (!z['word/document.xml']) throw new Error('لم أجد محتوى Word داخل الملف.');
    const doc = xml(await z['word/document.xml']()); const body = doc.getElementsByTagNameNS(W, 'body')[0];
    const items = [];
    for (const el of body.children) {
      if (el.localName === 'p') {
        const t = paraText(el); const st = (el.getElementsByTagNameNS(W, 'pStyle')[0]?.getAttributeNS(W, 'val') || '');
        if (t) items.push({type:'para', text:t, style:st, heading:/heading|title|عنوان/i.test(st), list: !!el.getElementsByTagNameNS(W, 'numPr').length || /list|قائمة|bullet|number/i.test(st)});
      }
      else if (el.localName === 'tbl') {
        for (const tr of kids(el, 'tr')) { const cells = kids(tr, 'tc').map(tc => kids(tc, 'p').map(paraText).filter(Boolean).join(' ')); if (cells.some(Boolean)) items.push({type:'row', cells}); }
      }
    }
    return items;
  }
  async function parseXlsx(buf) {
    const z = await readZip(buf); const items = [];
    let shared = [];
    if (z['xl/sharedStrings.xml']) shared = [...xml(await z['xl/sharedStrings.xml']()).getElementsByTagName('si')].map(si => [...si.getElementsByTagName('t')].map(t => t.textContent).join(''));
    const sheets = Object.keys(z).filter(k => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort((a,b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));
    if (!sheets.length) throw new Error('لم أجد أوراق عمل داخل ملف Excel.');
    for (const sh of sheets) {
      const d = xml(await z[sh]());
      for (const row of d.getElementsByTagName('row')) {
        const cells = [];
        for (const c of row.getElementsByTagName('c')) {
          const t = c.getAttribute('t'); let v = '';
          if (t === 's') v = shared[parseInt(c.getElementsByTagName('v')[0]?.textContent, 10)] ?? '';
          else if (t === 'inlineStr') v = [...c.getElementsByTagName('t')].map(x => x.textContent).join('');
          else v = c.getElementsByTagName('v')[0]?.textContent ?? '';
          v = String(v).replace(/\s+/g, ' ').trim(); if (v) cells.push(v);
        }
        if (cells.length) items.push({type:'row', cells});
      }
    }
    return items;
  }
  const norm = s => String(s || '').replace(/[\s.،:؛]+/g, ' ').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').trim();
  const PLO_RE = /^([ABCD])\s*[-.]?\s*(\d{1,2})$/i, PARA_RE = /^([ABCD])\s*[-.]?\s*(\d{1,2})\s*[:\-–.)]\s*(.{8,})$/i;
  const domainWords = {'المعرفة':'A','الفهم':'A','الذهنية':'B','المهنية':'C','العامة':'D','المنقولة':'D'};
  // يحوّل عناصر الملف إلى قائمة نواتج مقترحة
  function recognise(items, mode) {
    const out = [];
    for (const it of items) {
      if (it.type === 'row') {
        const cells = it.cells; let code = '', domainFromCode = '';
        for (const cell of cells) { const m = cell.replace(/\*/g,'').match(PLO_RE); if (m) { code = (m[1] + m[2]).toUpperCase(); domainFromCode = m[1].toUpperCase(); break; } }
        const textCell = cells.filter(c => !PLO_RE.test(c.trim()) && c.length >= (mode === 'program' ? 8 : 15)).sort((a,b) => b.length - a.length)[0];
        if (!textCell) continue;
        if (mode === 'program') { if (code) out.push({code, domain:domainFromCode, text:textCell}); }
        else {
          if (/^(الرمز|م|ناتج|نواتج|المجال)/.test(textCell) && textCell.length < 25) continue;
          const upper = cells.map(c => c.trim()).find(c => /^[ABCD]\d{1,2}$/.test(c));
          const dom = domainFromCode || (upper ? upper[0] : '') || ((cells.map(c => Object.entries(domainWords).find(([w]) => c.includes(w) && c.length < 40)).find(Boolean) || [])[1]) || 'A';
          out.push({code:'', domain:dom, text:textCell, plo: upper || ''});
        }
      } else {
        const m = it.text.match(PARA_RE);
        if (m) out.push({code:(m[1]+m[2]).toUpperCase(), domain:m[1].toUpperCase(), text:m[3].trim(), plo: mode === 'course' ? (m[1]+m[2]).toUpperCase() : ''});
        else if (mode === 'course' && !it.heading && it.text.length >= 20 && it.text.length <= 400 && !/[:：]$/.test(it.text)) out.push({code:'', domain:'A', text:it.text, plo:'', maybe: !(it.list || /^(ي|ت|أن|ان)/.test(it.text))});
      }
    }
    // إزالة التكرار
    const seen = new Set(); return out.filter(o => { const k = o.code + '|' + norm(o.text); if (seen.has(k)) return false; seen.add(k); return true; });
  }
  let imRows = [], imMode = 'program', imBackup = null;
  function statusOf(r) {
    const p = ploByCode[r.code]; if (!p) return 'new';
    return norm(p.text).replace(/ $/,'') === norm(r.text) ? 'same' : 'mod';
  }
  function renderPreview() {
    const box = $('imPreview');
    if (imBackup) { box.innerHTML = '<p>هذه نسخة احتياطية JSON. التطبيق سيستبدل تعديلاتك الحالية على المقررات ونواتج البرنامج بمحتوى الملف.</p>'; $('imApply').classList.remove('hidden'); return; }
    if (!imRows.length) { box.innerHTML = '<p class="error-text">لم أتعرف على نواتج في هذا الملف. تأكد أن كل ناتج في صف/فقرة وبجانبه الرمز (مثل A1 أو B3) أو اختر هدف «نواتج المقرر» لقراءة القوائم النصية.</p>'; $('imApply').classList.add('hidden'); return; }
    const lbl = {new:['جديد','st-new'], mod:['نص مختلف','st-mod'], same:['مطابق','st-same']};
    const head = imMode === 'program' ? '<th>تطبيق</th><th>الرمز</th><th>الحالة</th><th>النص المقروء</th><th>النص الحالي</th>' : '<th>تطبيق</th><th>المجال</th><th>الربط ببرنامج</th><th>النص المقروء</th>';
    const body = imRows.map((r,i) => imMode === 'program'
      ? `<tr><td><input type="checkbox" data-im="${i}" ${r.on?'checked':''}></td><td><b>${esc(r.code)}</b></td><td><span class="tag ${lbl[r.st][1]}">${lbl[r.st][0]}</span></td><td>${esc(r.text)}</td><td>${ploByCode[r.code]?esc(ploByCode[r.code].text):'—'}</td></tr>`
      : `<tr><td><input type="checkbox" data-im="${i}" ${r.on?'checked':''}></td><td><select data-imd="${i}">${domOrder.map(d => `<option value="${d}" ${d===r.domain?'selected':''}>${d} — ${D.domains[d]}</option>`).join('')}</select></td><td>${esc(r.plo||'—')}</td><td>${esc(r.text)}</td></tr>`).join('');
    box.innerHTML = `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
    box.querySelectorAll('[data-im]').forEach(c => c.addEventListener('change', () => { imRows[+c.dataset.im].on = c.checked; countSel(); }));
    box.querySelectorAll('[data-imd]').forEach(s => s.addEventListener('change', () => { imRows[+s.dataset.imd].domain = s.value; }));
    $('imApply').classList.remove('hidden'); countSel();
  }
  const countSel = () => { $('imApply').textContent = `تطبيق المحدد (${imRows.filter(r => r.on).length})`; };
  async function handleFile() {
    const f = $('imFile').files[0]; imRows = []; imBackup = null; $('imPreview').innerHTML = ''; $('imApply').classList.add('hidden'); $('imMsg').textContent = '';
    if (!f) return; imMode = $('imTarget').value;
    try {
      $('imMsg').textContent = 'جارٍ قراءة الملف...';
      const name = f.name.toLowerCase(); let items;
      if (name.endsWith('.json')) { const j = JSON.parse(await f.text()); if (!j || j.version !== 2) throw new Error('ملف JSON غير معروف. استخدم نسخة احتياطية صادرة من هذه المنظومة.'); imBackup = j; $('imMsg').textContent = 'تم التعرف على نسخة احتياطية.'; renderPreview(); return; }
      const buf = await f.arrayBuffer();
      if (name.endsWith('.docx')) items = await parseDocx(buf); else if (name.endsWith('.xlsx')) items = await parseXlsx(buf); else throw new Error('الصيغة غير مدعومة. ارفع .docx أو .xlsx (احفظ الملفات القديمة .doc/.xls بالصيغة الحديثة أولًا).');
      imRows = recognise(items, imMode).map(r => { const st = imMode === 'program' ? statusOf(r) : 'new'; return {...r, st, on: st !== 'same' && !r.maybe}; });
      $('imMsg').textContent = `قُرئ ${items.length} عنصرًا وتم التعرف على ${imRows.length} ناتجًا. راجع القائمة ثم اضغط تطبيق.`;
      renderPreview();
    } catch (err) { $('imMsg').textContent = ''; $('imPreview').innerHTML = `<p class="error-text">${esc(err.message || err)}</p>`; }
  }
  function applyImport() {
    if (imBackup) {
      if (!confirm('استبدال كل التعديلات الحالية بمحتوى النسخة الاحتياطية؟')) return;
      edits = imBackup.edits || {}; pedits = imBackup.programEdits || {edited:{}, added:[], deleted:[]}; save(KEY, edits); $('importDialog').close(); refreshAll(); return;
    }
    const chosen = imRows.filter(r => r.on);
    if (imMode === 'program') {
      chosen.forEach(r => {
        const base = basePlos.find(p => p.code === r.code), add = pedits.added.find(p => p.code === r.code);
        if (add) add.text = r.text;
        else if (base) { pedits.deleted = pedits.deleted.filter(x => x !== r.code); pedits.edited[r.code] = r.text; }
        else pedits.added.push({code:r.code, domain:r.domain, text:r.text});
      });
      refreshAll();
    } else {
      const e = state(cur);
      chosen.forEach(r => { if (!e.custom.some(x => norm(x.text) === norm(r.text))) e.custom.push({id:'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,5), domain:r.domain, text:r.text, plo:r.plo && ploByCode[r.plo] ? r.plo : ''}); });
      renderSpec();
    }
    $('importDialog').close();
  }

  function setTab(t) {
    ['spec','program','manage'].forEach(k => $('tab_'+k).classList.toggle('active', k===t));
    $('specPane').classList.toggle('hidden', t!=='spec'); $('programPane').classList.toggle('hidden', t!=='program'); $('manageView').classList.toggle('hidden', t!=='manage');
  }
  function step(d) { const i = Math.min(D.courses.length-1, Math.max(0, cur.id + d)); cur = D.courses[i]; $('courseSelect').value = i; renderSpec(); }
  function init() {
    applyProgramEdits(); buildSelect();
    $('courseSelect').addEventListener('change', e => { cur = D.courses[+e.target.value]; renderSpec(); });
    $('printBtn').addEventListener('click', () => window.print());
    $('resetBtn').addEventListener('click', () => { if (!confirm('إعادة ضبط هذا المقرر للاقتراحات الأولية؟ ستضيع تعديلاتك وإضافاتك عليه.')) return; delete edits[cur.id]; save(KEY, edits); renderSpec(); });
    $('exportBtn').addEventListener('click', () => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({version:2, exportedAt:new Date().toISOString(), edits, programEdits:pedits}, null, 2)], {type:'application/json'})); a.download = 'course_specs_backup.json'; a.click();
    });
    $('prevBtn').addEventListener('click', () => step(-1)); $('nextBtn').addEventListener('click', () => step(1));
    ['spec','program','manage'].forEach(k => $('tab_'+k).addEventListener('click', () => setTab(k)));
    $('outcomeForm').addEventListener('submit', submitOutcome);
    ['ocClose','ocCancel'].forEach(id => $(id).addEventListener('click', () => $('outcomeDialog').close()));
    const openImport = target => { $('imFile').value = ''; $('imPreview').innerHTML = ''; $('imMsg').textContent = ''; $('imApply').classList.add('hidden'); $('imTarget').value = target; $('importDialog').showModal(); };
    $('importBtn').addEventListener('click', () => openImport('course')); $('importBtn2').addEventListener('click', () => openImport('program'));
    ['imClose','imCancel'].forEach(id => $(id).addEventListener('click', () => $('importDialog').close()));
    $('imFile').addEventListener('change', handleFile); $('imTarget').addEventListener('change', handleFile);
    $('imApply').addEventListener('click', applyImport);
    document.addEventListener('rolechange', () => { renderProgram(); renderSpec(); });
    renderProgram(); renderSpec(); setTab('spec');
  }
  init();
})();
