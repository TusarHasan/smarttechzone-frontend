// ============================================================================
// Flash Sale ছাড়ের নিয়ম — নির্দিষ্ট কিছু হাই-প্রফিট ক্যাটাগরিতে বাড়তি ছাড় দেখানোর জন্য
// (দারাজ প্রতি আইটেমে ৩৫%+ কমিশন নেয়, তাই এই ক্যাটাগরিগুলোতে নিজের সাইটে প্রতিযোগিতামূলক
// কম দাম রাখা যায়)। এই ফাইলটা ডাটাবেজের কোনো প্রোডাক্টের price/originalPrice ফিল্ড পরিবর্তন
// করে না — শুধু হোমপেজের Flash Sale সেকশনে দেখানোর সময় হিসেব করে। এর সুবিধা: নতুন প্রোডাক্ট
// যোগ হলে বা দাম বদলালে প্রতিটা প্রোডাক্ট আলাদাভাবে এডিট করা লাগে না, নিয়মটা এক জায়গায় থাকে।
//
// ক্যাটাগরির নাম গুলো backend/utils/detect.js ও admin প্যানেলের add-products-form.js এর
// AP_CATEGORIES লিস্টের সাথে হুবহু মিলিয়ে দেওয়া হয়েছে (নইলে কোনো প্রোডাক্ট ম্যাচ হবে না):
//   - "Outside Key" (Pixel মডেল বাদে)   -> ৪০% ছাড়
//   - "SIM Card Tray"                   -> ৪০% ছাড়   (ব্যবহারকারী বলেছিলেন "Sim Tray")
//   - "Power Volume Flex"               -> ৪০% ছাড়
//   - "Back Panel"                      -> ২০% ছাড়   (ব্যাকশেল/ব্যাক কভার/ব্যাটারি কভার এই
//        ক্যাটাগরির আন্ডারে পড়ে — লক্ষ্য করবেন "Body Housing" এডমিন প্যানেলে আলাদা ক্যাটাগরি,
//        ব্যাকশেল/ব্যাক কভার সেখানে না বরং "Back Panel"-এ পড়ে, তাই এখানে "Back Panel" ব্যবহার
//        করা হয়েছে — ভুল হলে নিচের FLASH_SALE_RULES এ ক্যাটাগরির নাম বদলে দিলেই হবে)
const FLASH_SALE_RULES = [
    { category: 'Outside Key', excludeKeyword: 'Pixel', discountPct: 40 },
    { category: 'SIM Card Tray', discountPct: 40 },
    { category: 'Power Volume Flex', discountPct: 40 },
    { category: 'Back Panel', discountPct: 20 },
];

// একটা প্রোডাক্টের জন্য প্রযোজ্য rule খুঁজে বের করে (না মিললে null)
function getFlashSaleRule(product) {
    if (!product || !product.category) return null;
    for (const rule of FLASH_SALE_RULES) {
        if (product.category === rule.category) {
            const name = (product.name || '').toLowerCase();
            if (rule.excludeKeyword && name.includes(rule.excludeKeyword.toLowerCase())) continue;
            return rule;
        }
    }
    return null;
}

// বেস প্রাইসের উপর ছাড় হিসেব করে রাউন্ড করা টাকা রিটার্ন করে
function computeFlashPrice(basePrice, discountPct) {
    const p = Number(basePrice) || 0;
    return Math.round(p * (1 - discountPct / 100));
}
