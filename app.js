// app.js

// =================================================================
// GA4 이벤트 전송 함수 (gtag() 직접 사용)
// HTML 파일에 <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
// 코드가 삽입되어 gtag() 함수가 전역에 정의되어 있다고 가정합니다.
// =================================================================
function fireGA4Event(eventName, parameters) {
    // console.log('🔥 GA4 Event Fired!', {
    //     event: eventName,
    //     ...parameters
    // });

    // gtag()가 정의되어 있는지 확인하고 이벤트 전송
    if (typeof gtag === 'function') {
        // e-commerce 이벤트는 'event'와 'items' 배열을 포함하는 단일 객체로 전송됩니다.
        // fireGA4Event의 parameters 구조가 GA4 e-commerce 표준과 유사하여 바로 사용 가능합니다.
        
        // 예시: eventName이 'purchase'라면, gtag('event', 'purchase', { transaction_id: 'T-100', items: [...] }) 형태로 전송됩니다.
        gtag('event', eventName, parameters);
        
    } else {
        console.warn('GA4 gtag() 함수가 정의되지 않았습니다. HTML 파일에 추적 코드를 확인하세요.');
    }
}


// =================================================================
// 장바구니 관리 (localStorage 사용)
// (기존 코드와 동일)
// =================================================================
function getCart() {
    return JSON.parse(localStorage.getItem('cart')) || [];
}

function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

function addToCart(productId, productName, productPrice, quantity, variant) {
    const cart = getCart();
    const existingItem = cart.find(item => item.id === productId && JSON.stringify(item.variant) === JSON.stringify(variant));

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({ id: productId, name: productName, price: productPrice, quantity: quantity, variant: variant });
    }
    saveCart(cart);
}

function updateCartCount() {
    const cart = getCart();
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountElements = document.querySelectorAll('#cart-count');
    cartCountElements.forEach(el => el.textContent = totalCount);
}


// =================================================================
// 페이지별 로딩 및 렌더링 함수
// (기존 코드와 동일)
// =================================================================

// 상품 목록을 렌더링하는 공통 함수
function renderProducts(products, containerElement, itemListId, itemListName) {
    if (!containerElement) return;
    containerElement.innerHTML = '';
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <a href="product-detail.html?id=${product.id}" class="select-item-trigger" data-product-id="${product.id}" data-product-name="${product.name}">
                <img src="${product.image}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p class="price">${product.price.toLocaleString()}원</p>
            </a>
        `;
        containerElement.appendChild(productCard);
    });

    // select_item 이벤트 리스너 추가
    document.querySelectorAll('.select-item-trigger').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            const product = products.find(p => p.id === trigger.dataset.productId);
            fireGA4Event('select_item', {
                item_list_id: itemListId,
                item_list_name: itemListName,
                items: [{
                    item_id: product.id,
                    item_name: product.name,
                    price: product.price,
                    item_category: product.category,
                    index: Array.from(containerElement.children).indexOf(trigger.parentElement) + 1
                }]
            });
        });
    });

    // view_item_list 이벤트 발생
    fireGA4Event('view_item_list', {
        item_list_id: itemListId,
        item_list_name: itemListName,
        items: products.map((p, index) => ({
            item_id: p.id,
            item_name: p.name,
            price: p.price,
            item_category: p.category,
            index: index + 1
        }))
    });
}


// 홈 페이지 로딩
async function loadHomePage(products) {
    const recommendedProducts = products.slice(0, 4);
    const container = document.getElementById('recommended-products');
    renderProducts(recommendedProducts, container, 'home_recommendations', '홈 추천 상품');
    
    // alert() 대신 console.error() 또는 다른 비파괴적 UI를 사용하도록 수정합니다.
    const promoBanner = document.getElementById('promo-banner');
    if (promoBanner) {
        promoBanner.addEventListener('click', (e) => {
            e.preventDefault();
            fireGA4Event('view_promotion', {
                promotion_id: e.target.dataset.promotionId || 'home_banner_01', // 데이터셋이 없을 경우 대비
                promotion_name: e.target.dataset.promotionName || 'Spring Sale',
            });
            console.log('프로모션 배너 클릭 이벤트가 수집되었습니다!'); // alert() 대신 console.log 사용
        });
    }
}

// 전체 상품 페이지 로딩
async function loadProductsPage(products) {
    const container = document.getElementById('all-products');
    renderProducts(products, container, 'all_products_list', '전체 상품 목록');
}

// 상품 상세 페이지 로딩
async function loadProductDetailPage(products) {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');
    const product = products.find(p => p.id === productId);
    const container = document.getElementById('product-detail-main');

    if (product) {
        let optionsHtml = '';
        for (const key in product.options) {
            optionsHtml += `<label for="option-${key}">${key}</label><select id="option-${key}" class="product-option">`;
            product.options[key].forEach(value => {
                optionsHtml += `<option value="${value}">${value}</option>`;
            });
            optionsHtml += `</select>`;
        }

        container.innerHTML = `
            <div class="product-detail-layout">
                <div class="product-image-container">
                    <img src="${product.image}" alt="${product.name}" style="max-width: 100%;">
                </div>
                <div class="product-info-container">
                    <h1>${product.name}</h1>
                    <p style="font-size: 1.5em; color: var(--primary-color);">${product.price.toLocaleString()}원</p>
                    <p>${product.description}</p>
                    ${optionsHtml}
                    <button id="add-to-cart-btn" class="btn">장바구니 담기</button>
                </div>
            </div>
        `;
        
        // view_item 이벤트 발생
        fireGA4Event('view_item', {
            currency: 'KRW',
            value: product.price,
            items: [{
                item_id: product.id,
                item_name: product.name,
                price: product.price,
                item_category: product.category
            }]
        });

        // add_to_cart 이벤트 리스너 추가
        document.getElementById('add-to-cart-btn').addEventListener('click', () => {
            const selectedOptions = {};
            document.querySelectorAll('.product-option').forEach(select => {
                const label = document.querySelector(`label[for="${select.id}"]`);
                selectedOptions[label.textContent] = select.value;
            });

            addToCart(product.id, product.name, product.price, 1, selectedOptions);
            // alert() 대신 console.log 사용
            console.log(`${product.name} 상품이 장바구니에 담겼습니다.`);

            fireGA4Event('add_to_cart', {
                currency: 'KRW',
                value: product.price,
                items: [{
                    item_id: product.id,
                    item_name: product.name,
                    price: product.price,
                    item_category: product.category,
                    item_variant: Object.values(selectedOptions).join('/'),
                    quantity: 1
                }]
            });
        });

    } else {
        container.innerHTML = `<h1>상품을 찾을 수 없습니다.</h1>`;
    }
}

// 장바구니 페이지 로딩
async function loadCartPage(products) {
    const cart = getCart();
    const container = document.getElementById('cart-items-container');
    const summaryContainer = document.getElementById('cart-summary');
    
    if (cart.length === 0) {
        container.innerHTML = '<p>장바구니가 비어있습니다.</p>';
        // summaryContainer는 cart.html의 HTML 스크립트에서 처리하므로 여기서는 건드리지 않습니다.
        return;
    }

    container.innerHTML = '';
    let totalValue = 0;
    const itemsForGA4 = cart.map(item => {
        const product = products.find(p => p.id === item.id);
        totalValue += item.price * item.quantity;
        
        container.innerHTML += `
            <div class="cart-item">
                <img src="${product.image}" alt="${item.name}">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>${Object.values(item.variant).join('/')}</p>
                </div>
                <p>${item.quantity}개</p>
                <p>${(item.price * item.quantity).toLocaleString()}원</p>
            </div>
        `;
        return {
            item_id: item.id,
            item_name: item.name,
            price: item.price,
            item_category: product.category, // category 추가
            item_variant: Object.values(item.variant).join('/'),
            quantity: item.quantity
        };
    });

    // cart.html의 HTML 스크립트에서 총합과 버튼이 이미 렌더링되므로, 여기서는 총합만 업데이트합니다.
    // 기존 HTML 스크립트를 사용하지 않는다고 가정하고, 여기서 직접 버튼과 총합을 렌더링하도록 변경합니다.
    summaryContainer.innerHTML = `
        <h2>총 주문 금액: ${totalValue.toLocaleString()}원</h2>
        <a href="checkout.html" id="begin-checkout-btn" class="btn">주문하기</a>
    `;

    // view_cart 이벤트 발생 (HTML 파일의 스크립트 대신 여기서 실행)
    fireGA4Event('view_cart', {
        currency: 'KRW',
        value: totalValue,
        items: itemsForGA4
    });
    
    // begin_checkout 이벤트 리스너
    document.getElementById('begin-checkout-btn').addEventListener('click', () => {
        fireGA4Event('begin_checkout', {
            currency: 'KRW',
            value: totalValue,
            items: itemsForGA4
        });
    });
}

// 결제 페이지 로딩
function loadCheckoutPage() {
    const cart = getCart();
    const totalValue = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shippingCost = 3000;
    const grandTotal = totalValue + shippingCost;
    
    // GA4 items 데이터 준비 (checkout 페이지에서는 products.json에서 category 정보를 가져와야 함)
    // 현재 loadCheckoutPage에서는 products 데이터를 받지 않으므로, 이 데이터를 가져오는 로직이 필요합니다. 
    // 임시로 cart 정보만 사용합니다. (BigQuery에서 item_category가 null이 될 수 있습니다.)

    document.getElementById('order-summary').innerHTML += `
        <div class="order-summary-item"><span>상품 금액</span><span>${totalValue.toLocaleString()}원</span></div>
        <div class="order-summary-item"><span>배송비</span><span>${shippingCost.toLocaleString()}원</span></div>
        <div class="order-summary-item" style="font-weight:bold;"><span>총 결제 금액</span><span>${grandTotal.toLocaleString()}원</span></div>
    `;

    document.getElementById('shipping-form').addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('배송 정보가 저장되었습니다.'); // alert() 대신 console.log 사용
        fireGA4Event('add_shipping_info', {
            currency: 'KRW',
            value: grandTotal,
            shipping_tier: 'Standard Shipping', // 예시
            items: cart.map(item => ({...item}))
        });
    });

    document.getElementById('payment-form').addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('결제 수단이 저장되었습니다.'); // alert() 대신 console.log 사용
        fireGA4Event('add_payment_info', {
            currency: 'KRW',
            value: grandTotal,
            payment_type: document.getElementById('payment-method').value,
            items: cart.map(item => ({...item}))
        });
    });

    document.getElementById('purchase-button').addEventListener('click', () => {
        const transactionId = `T-${Date.now()}`;
        
        // purchase 이벤트 발생
        fireGA4Event('purchase', {
            transaction_id: transactionId,
            value: grandTotal,
            shipping: shippingCost,
            currency: 'KRW',
            items: cart.map(item => ({...item}))
        });
        
        // 장바구니 비우기
        localStorage.removeItem('cart');
        // 주문 완료 페이지로 이동
        window.location.href = `confirmation.html?tid=${transactionId}`;
    });
}

// 주문 완료 페이지 로딩
function loadConfirmationPage() {
    const params = new URLSearchParams(window.location.search);
    const tid = params.get('tid');
    document.getElementById('transaction-id').textContent = tid;
}

// =================================================================
// 메인 실행 로직
// =================================================================
document.addEventListener('DOMContentLoaded', async () => {
    updateCartCount();
    
    // 모든 페이지에서 products.json이 필요하므로 먼저 로드
    try {
        const response = await fetch('products.json');
        const products = await response.json();
        
        const pageId = document.body.id;
        
        // loadCheckoutPage()가 products를 참조하도록 수정 필요
        if (pageId === 'page-home') {
            loadHomePage(products);
        } else if (pageId === 'page-products') {
            loadProductsPage(products);
        } else if (pageId === 'page-product-detail') {
            loadProductDetailPage(products);
        } else if (pageId === 'page-cart') {
            loadCartPage(products);
        } else if (pageId === 'page-checkout') {
            // products 데이터를 loadCheckoutPage로 전달하도록 수정
            loadCheckoutPage(products); 
        } else if (pageId === 'page-confirmation') {
            loadConfirmationPage();
        }
    } catch(error) {
        console.error("상품 데이터를 불러오는 데 실패했습니다:", error);
    }
});
