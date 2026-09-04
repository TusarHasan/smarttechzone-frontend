// এই স্ক্রিপ্টটা একবার চালালে brands/ এবং models/ ফোল্ডারের সব .html ফাইলে
// স্বয়ংক্রিয়ভাবে footer বসে যাবে।
//
// চালানোর নিয়ম: আপনার root প্রজেক্ট ফোল্ডারে (যেখানে index.html, footer.js আছে) এই ফাইলটা
// "add-footer.js" নামে সেভ করে টার্মিনালে লিখুন:
//     node add-footer.js

const fs = require('fs');
const path = require('path');

const FOLDERS_TO_SCAN = ['brands', 'models'];

// footer.js কতটা "গভীরে" আছে সেটা বের করে সঠিক relative path বানানোর জন্য
function relativeFooterPath(fileDir, rootDir) {
    const rel = path.relative(fileDir, rootDir).replace(/\\/g, '/');
    return (rel ? rel + '/' : './') + 'footer.js';
}

const FOOTER_MARKER = 'id="siteFooter"';

function processFile(filePath, rootDir) {
    let html = fs.readFileSync(filePath, 'utf-8');

    if (html.includes(FOOTER_MARKER)) {
        console.log(`⏭️  ইতিমধ্যে আছে, বাদ দেওয়া হলো: ${filePath}`);
        return;
    }

    if (!html.includes('</body>')) {
        console.log(`⚠️  </body> ট্যাগ পাওয়া যায়নি, বাদ দেওয়া হলো: ${filePath}`);
        return;
    }

    const footerJsPath = relativeFooterPath(path.dirname(filePath), rootDir);
    const injection = `
    <div id="siteFooter"></div>
    <script src="${footerJsPath}"></script>
</body>`;

    html = html.replace('</body>', injection);
    fs.writeFileSync(filePath, html, 'utf-8');
    console.log(`✅ Footer যোগ হলো: ${filePath}`);
}

function walkFolder(folder, rootDir) {
    if (!fs.existsSync(folder)) {
        console.log(`ℹ️  ফোল্ডার নেই, বাদ দেওয়া হলো: ${folder}`);
        return;
    }
    const entries = fs.readdirSync(folder, { withFileTypes: true });
    entries.forEach(entry => {
        const fullPath = path.join(folder, entry.name);
        if (entry.isDirectory()) {
            walkFolder(fullPath, rootDir);
        } else if (entry.isFile() && entry.name.endsWith('.html')) {
            processFile(fullPath, rootDir);
        }
    });
}

const rootDir = __dirname;
console.log('🔍 শুরু হচ্ছে...\n');
FOLDERS_TO_SCAN.forEach(folder => {
    walkFolder(path.join(rootDir, folder), rootDir);
});
console.log('\n🎉 সম্পন্ন!');