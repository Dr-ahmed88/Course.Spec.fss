# دليل الرفع إلى GitHub وتشغيل التطبيق

## 1) رفع الملفات إلى GitHub
1. أنشئ مستودعًا جديدًا في GitHub، مثل `course-specification-app`.
2. فك ضغط الحزمة على جهازك.
3. ارفع محتويات المجلد إلى جذر المستودع؛ يجب أن يكون `index.html` في الجذر مباشرة، وليس داخل مجلد فرعي.
4. ارفع الملفات التالية: `index.html`, `styles.css`, `app.js`, `cloud-config.js`, `supabase_setup.sql`, `README.md`, `README_AR.txt`, `DEPLOY_AR.md`, `.gitignore`, `.nojekyll`.

## 2) تشغيله على GitHub Pages (واجهة ثابتة)
1. من المستودع افتح **Settings → Pages**.
2. اختر النشر من الفرع `main` ومن المجلد `/ (root)` ثم احفظ.
3. انتظر ظهور رابط الموقع في صفحة Pages.

> GitHub Pages يستضيف ملفات الواجهة فقط؛ لا ينشئ قاعدة بيانات ولا يحمي البيانات بمفرده. لتسجيل دخول حقيقي ومشاركة البيانات، اربط Supabase واضبط سياسات الأمان.

## 3) إعداد Supabase
1. أنشئ مشروعًا في Supabase.
2. افتح SQL Editor ونفّذ محتويات `supabase_setup.sql`.
3. من Authentication أنشئ مستخدم المسؤول، ثم اتبع تعليمات نهاية ملف SQL لإسناد دور `admin` إلى UUID الخاص به.
4. من إعدادات API انسخ **Project URL** والمفتاح العام **anon/publishable** فقط.
5. افتح `cloud-config.js` وضع القيم بالشكل التالي:

```js
window.COURSE_APP_SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
window.COURSE_APP_SUPABASE_KEY = 'YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY';
```

6. احفظ التعديلات وارفعها إلى GitHub، ثم أعد تحميل الموقع.

**تحذير أمني:** لا تضع `service_role` أو أي مفتاح سري أو كلمة مرور في `cloud-config.js` أو أي ملف يُرفع إلى GitHub. إذا سبق رفع مفتاح سري، ألغِه/دوّره من لوحة Supabase فورًا.

## 4) النشر عبر Netlify بدل GitHub Pages
يمكن ربط مستودع GitHub مباشرةً من Netlify واختيار النشر من جذر المشروع. لا يحتاج هذا التطبيق الثابت إلى أمر build في نسخته الحالية.

## 5) فحص سريع
- تأكد أن `index.html` في جذر المستودع.
- تأكد من تحميل `styles.css` و`app.js` دون أخطاء.
- إذا كانت إعدادات Supabase فارغة فسيظهر وضع تجريبي محلي، وليس قاعدة بيانات مشتركة.
- اختبر الدخول وإضافة سجل وتعديله وحذفه قبل مشاركة الرابط.
