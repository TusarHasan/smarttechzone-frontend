const API_BASE = 'http://localhost:5000';

function resolveImageUrl(url) {
    if (!url) return 'https://via.placeholder.com/400';
    return url.startsWith('http') ? url : `${API_BASE}${url}`;
}

// URL থেকে প্রোডাক্টের আইডি সংগ্রহ করা
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

async function fetchProductDetails() {
    const container = document.getElementById('productDetailView');
    
    if (!productId) {
        container.innerHTML = '<p style="text-align: center; color: red; padding: 40px;">কোনো প্রোডাক্ট আইডি পাওয়া যায়নি!</p>';
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/products/${productId}`);
        if (!response.ok) throw new Error('প্রোডাক্ট লোড করতে ব্যর্থ হয়েছে');
        
        const product = await response.json();

        // ছবির লিস্ট বা ফলব্যাক ইমেজ তৈরি (লোকাল আপলোড এবং Daraz এর পুরোনো লিংক দুটোই ঠিকভাবে সামলাবে)
        const images = (product.images && product.images.length > 0)
            ? product.images.map(resolveImageUrl)
            : ['https://via.placeholder.com/400'];
        const mainImage = images[0];

        // থাম্বনেইল গ্যালারি তৈরি
        let thumbnailsHtml = images.map((img, index) => `
            <img src="${img}" onclick="changeMainImage('${img}', this)" onerror="this.src='https://via.placeholder.com/100?text=No+Image'" class="thumb-img ${index === 0 ? 'active' : ''}" style="width: 60px; height: 60px; object-fit: contain; border: 1px solid ${index === 0 ? '#f57224' : '#ddd'}; border-radius: 4px; cursor: pointer;">
        `).join('');

        // দারাজ স্টাইলের লেআউট ডিজাইন (উপরের অংশ এবং নিচের বিবরণী সহ)
        container.innerHTML = `
            <div class="product-top-section" style="display: flex; gap: 40px; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); margin-bottom: 20px;">
                <div class="product-gallery" style="flex: 1; display: flex; flex-direction: column; gap: 15px;">
                    <div class="main-img-container" style="border: 1px solid #eee; padding: 10px; border-radius: 6px; text-align: center;">
                        <img id="mainImage" src="${mainImage}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/400?text=No+Image'" style="width: 100%; height: 350px; object-fit: contain;">
                    </div>
                    <div class="thumbnail-list" style="display: flex; gap: 10px; overflow-x: auto;">
                        ${thumbnailsHtml}
                    </div>
                </div>

                <div class="product-details-info" style="flex: 1.5; display: flex; flex-direction: column; gap: 15px;">
                    <h1 style="font-size: 20px; color: #222; line-height: 1.4;">${product.name}</h1>
                    
                    <div style="font-size: 13px; color: #666;">
                        Brand: <span style="color: #1a9cb7; font-weight: bold;">${product.brand || 'No Brand'}</span> | 
                        Model: <span style="font-weight: bold;">${product.model || 'N/A'}</span> | 
                        Part Type: <span style="font-weight: bold;">${product.partType || 'Spare Parts'}</span>
                    </div>

                    <div style="background: #fafafa; padding: 15px; border-radius: 6px;">
                        <div style="font-size: 28px; color: #f57224; font-weight: bold;">৳ ${product.price}</div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 15px; margin-top: 10px;">
                        <label style="font-weight: bold; font-size: 14px;">Quantity:</label>
                        <div style="display: flex; align-items: center; border: 1px solid #ddd; border-radius: 4px;">
                            <button onclick="updateQty(-1)" style="padding: 5px 12px; background: #f5f5f5; border: none; cursor: pointer; font-size: 16px;">-</button>
                            <span id="qtyValue" style="padding: 0 15px; font-weight: bold;">1</span>
                            <button onclick="updateQty(1)" style="padding: 5px 12px; background: #f5f5f5; border: none; cursor: pointer; font-size: 16px;">+</button>
                        </div>
                    </div>

                    <div style="display: flex; gap: 15px; margin-top: 20px;">
                        <button style="flex: 1; background: #2bbef9; color: white; border: none; padding: 12px; font-size: 16px; font-weight: bold; border-radius: 4px; cursor: pointer;">Buy Now</button>
                        <button onclick="addToCart('${product._id}')" style="flex: 1; background: #f57224; color: white; border: none; padding: 12px; font-size: 16px; font-weight: bold; border-radius: 4px; cursor: pointer;">Add to Cart</button>
                    </div>
                </div>
            </div>

            <!-- দারাজ স্টাইলের নিচের বিবরণী সেকশন -->
            <div class="product-description-section" style="background: #fff; padding: 25px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <h3 style="border-bottom: 2px solid #f57224; padding-bottom: 10px; margin-bottom: 15px; color: #333; font-size: 18px;">Product details of ${product.name}</h3>
                <div style="color: #555; line-height: 1.8; font-size: 14px;">
                    <p><strong>Brand:</strong> ${product.brand || 'No Brand'}</p>
                    <p><strong>Compatible Model:</strong> ${product.model || 'N/A'}</p>
                    <p><strong>Part Type:</strong> ${product.partType || 'Spare Parts'}</p>
                    <p style="margin-top: 10px;">${product.description ? product.description.replace(/\n/g, '<br>') : 'Perfect fit for your mobile device, ensuring smooth installation and long-lasting durability. Get fast delivery across Bangladesh from Smart Tech Zone.'}</p>
                </div>
            </div>
        `;

    } catch (err) {
        console.error('Error:', err);
        container.innerHTML = '<p style="text-align: center; color: red; padding: 40px;">প্রোডাক্টের তথ্য লোড করতে সমস্যা হয়েছে।</p>';
    }
}

// মেইন ছবি পরিবর্তন করার ফাংশন (থাম্বনেইলে ক্লিক করলে)
function changeMainImage(imgUrl, element) {
    document.getElementById('mainImage').src = imgUrl;
    document.querySelectorAll('.thumb-img').forEach(img => img.style.borderColor = '#ddd');
    element.style.borderColor = '#f57224';
}

// কোয়ান্টিটি বাড়ানোর বা কমানোর ফাংশন
let quantity = 1;
function updateQty(change) {
    quantity += change;
    if (quantity < 1) quantity = 1;
    document.getElementById('qtyValue').innerText = quantity;
}

// পেজ লোড হওয়ার সাথে সাথে ডেটা ফেচ করা
fetchProductDetails();