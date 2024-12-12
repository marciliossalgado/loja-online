class Product {
    constructor(id, title, price, image) {
        this.id = id;
        this.title = title;
        this.price = price;
        this.image = image;
    }
}

class CartItem {
    constructor(product, quantity = 1) {
        this.product = product;
        this.quantity = quantity;
    }

    get total() {
        return this.product.price * this.quantity;
    }
}

class ShoppingCartUseCase {
    constructor(productRepository, cartRepository) {
        this.productRepository = productRepository;
        this.cartRepository = cartRepository;
    }

    async getProducts() {
        return await this.productRepository.fetchAll();
    }

    addToCart(productId) {
        const product = this.productRepository.getById(productId);
        if (product) {
            this.cartRepository.addItem(new CartItem(product));
        }
    }

    removeFromCart(productId) {
        this.cartRepository.removeItem(productId);
    }

    changeQuantity(productId, delta) {
        this.cartRepository.updateQuantity(productId, delta);
    }

    getCartItems() {
        return this.cartRepository.getItems();
    }

    getCartTotal() {
        return this.cartRepository.getTotal();
    }

    getCartItemCount() {
        return this.cartRepository.getItemCount();
    }

    checkout() {
        const items = this.cartRepository.getItems();
        const total = this.cartRepository.getTotal();
        this.cartRepository.clear();
        return { items, total };
    }
}

class ProductRepository {
    constructor() {
        this.products = [];
    }

    async fetchAll() {
        try {
            const response = await fetch('https://fakestoreapi.com/products');
            const data = await response.json();
            this.products = data.map(p => new Product(p.id, p.title, p.price, p.image));
            return this.products;
        } catch (error) {
            console.error('Erro ao buscar produtos:', error);
            throw error;
        }
    }

    getById(id) {
        return this.products.find(p => p.id === id);
    }
}

class CartRepository {
    constructor() {
        this.items = [];
    }

    addItem(cartItem) {
        const existingItem = this.items.find(item => item.product.id === cartItem.product.id);
        if (existingItem) {
            existingItem.quantity++;
        } else {
            this.items.push(cartItem);
        }
    }

    removeItem(productId) {
        this.items = this.items.filter(item => item.product.id !== productId);
    }

    updateQuantity(productId, delta) {
        const item = this.items.find(item => item.product.id === productId);
        if (item) {
            item.quantity += delta;
            if (item.quantity <= 0) {
                this.removeItem(productId);
            }
        }
    }

    getItems() {
        return this.items;
    }

    getTotal() {
        return this.items.reduce((sum, item) => sum + item.total, 0);
    }

    getItemCount() {
        return this.items.reduce((count, item) => count + item.quantity, 0);
    }

    clear() {
        this.items = [];
    }
}

class ShoppingCartUI {
    constructor(useCase) {
        this.useCase = useCase;
        this.productsElement = document.getElementById('products');
        this.cartItemsElement = document.getElementById('cart-items');
        this.cartTotalElement = document.getElementById('cart-total');
        this.cartCountElement = document.getElementById('cart-count');
        this.loadingElement = document.getElementById('loading');
        this.checkoutButton = document.getElementById('checkout-button');
        this.searchInput = document.getElementById('search-input');
        this.sortSelect = document.getElementById('sort-select');
        this.cartIcon = document.getElementById('cart-icon');
        this.cart = document.getElementById('cart');
        this.overlay = document.getElementById('overlay');
        this.closeCart = document.getElementById('close-cart');

        this.checkoutButton.addEventListener('click', () => this.checkout());
        this.searchInput.addEventListener('input', () => this.filterAndSortProducts());
        this.sortSelect.addEventListener('change', () => this.filterAndSortProducts());
        this.cartIcon.addEventListener('click', () => this.toggleCart());
        this.closeCart.addEventListener('click', () => this.toggleCart());
        this.overlay.addEventListener('click', () => this.toggleCart());
        
        this.itemsPerPage = 8;
        this.currentPage = 1;
        this.observer = new IntersectionObserver(this.handleIntersection.bind(this), {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        });
        
        this.loadProducts();
    }

    async loadProducts() {
        this.displaySkeletonLoading();
        try {
            this.products = await this.useCase.getProducts();
            this.filterAndSortProducts();
            this.loadingElement.style.display = 'none';
        } catch (error) {
            this.loadingElement.textContent = 'Erro ao carregar produtos. Por favor, tente novamente mais tarde.';
        }
    }

    displaySkeletonLoading() {
        const skeletonHTML = Array(this.itemsPerPage).fill().map(() => `
            <div class="product skeleton">
                <div class="skeleton-img"></div>
                <div class="skeleton-text"></div>
                <div class="skeleton-text"></div>
                <div class="skeleton-text"></div>
            </div>
        `).join('');
        this.productsElement.innerHTML = skeletonHTML;
    }

    filterAndSortProducts() {
        let filteredProducts = this.products.filter(product =>
            product.title.toLowerCase().includes(this.searchInput.value.toLowerCase())
        );

        const sortValue = this.sortSelect.value;
        if (sortValue === 'price-asc') {
            filteredProducts.sort((a, b) => a.price - b.price);
        } else if (sortValue === 'price-desc') {
            filteredProducts.sort((a, b) => b.price - a.price);
        }

        this.filteredProducts = filteredProducts;
        this.currentPage = 1;
        this.displayProducts();
    }

    displayProducts() {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const productsToShow = this.filteredProducts.slice(startIndex, endIndex);

        const newProductElements = productsToShow.map(product => {
            const productElement = document.createElement('div');
            productElement.className = 'product';
            productElement.style.opacity = '0';
            productElement.style.transform = 'translateY(20px)';
            productElement.innerHTML = `
                <img src="${product.image}" alt="${product.title}" loading="lazy">
                <h3>${product.title}</h3>
                <p class="price">R$ ${product.price.toFixed(2)}</p>
                <button onclick="ui.addToCart(${product.id})">Adicionar ao Carrinho</button>
            `;
            return productElement;
        });

        if (this.currentPage === 1) {
            this.productsElement.innerHTML = '';
        }

        newProductElements.forEach((element, index) => {
            this.productsElement.appendChild(element);
            setTimeout(() => {
                element.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, index * 100);
        });

        if (this.currentPage * this.itemsPerPage < this.filteredProducts.length) {
            const loadMoreTrigger = document.createElement('div');
            loadMoreTrigger.id = 'load-more-trigger';
            loadMoreTrigger.style.height = '1px';
            this.productsElement.appendChild(loadMoreTrigger);
            this.observer.observe(loadMoreTrigger);
        }
    }

    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                this.observer.unobserve(entry.target);
                entry.target.remove();
                this.currentPage++;
                this.displayProducts();
            }
        });
    }

    addToCart(productId) {
        this.useCase.addToCart(productId);
        this.updateCart();
        this.animateCartIcon();
    }

    removeFromCart(productId) {
        this.useCase.removeFromCart(productId);
        this.updateCart();
    }

    changeQuantity(productId, delta) {
        this.useCase.changeQuantity(productId, delta);
        this.updateCart();
    }

    updateCart() {
        const items = this.useCase.getCartItems();
        this.cartItemsElement.innerHTML = items.map(item => `
            <li>
                <img src="${item.product.image}" alt="${item.product.title}" width="50">
                <div>
                    <h4>${item.product.title.substring(0, 20)}...</h4>
                    <div class="quantity-control">
                        <button onclick="ui.changeQuantity(${item.product.id}, -1)">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="ui.changeQuantity(${item.product.id}, 1)">+</button>
                    </div>
                </div>
                <span>R$ ${item.total.toFixed(2)}</span>
                <button onclick="ui.removeFromCart(${item.product.id})" class="remove-item">&times;</button>
            </li>
        `).join('');
        this.cartTotalElement.textContent = `Total: R$ ${this.useCase.getCartTotal().toFixed(2)}`;
        this.cartCountElement.textContent = this.useCase.getCartItemCount();
    }

    animateCartIcon() {
        this.cartIcon.classList.add('bounce');
        setTimeout(() => {
            this.cartIcon.classList.remove('bounce');
        }, 300);
    }

    checkout() {
        const { items, total } = this.useCase.checkout();
        if (items.length === 0) {
            alert("Seu carrinho está vazio!");
            return;
        }
        window.currentCheckoutInstance = new CheckoutPage(items, total);
    }

    toggleCart() {
        this.cart.classList.toggle('open');
        this.overlay.style.display = this.cart.classList.contains('open') ? 'block' : 'none';
    }
}

class CheckoutPage {
    constructor(cartItems, total) {
        this.cartItems = cartItems;
        this.total = total;
        this.shipping = 0;
        this.initPage();
    }

    initPage() {
        const checkoutContainer = document.createElement('div');
        checkoutContainer.id = 'checkout-container';
        checkoutContainer.innerHTML = `
            <h2>Finalizar Compra</h2>
            <div id="cart-summary"></div>
            <form id="address-form">
                <h3>Endereço de Entrega</h3>
                <label>CEP:
                    <input type="text" id="cep" size="10" maxlength="9" required>
                </label>
                <label>Rua:
                    <input type="text" id="rua" size="60" required>
                </label>
                <label>Número:
                    <input type="text" id="numero" size="10" required>
                </label>
                <label>Complemento:
                    <input type="text" id="complemento" size="40">
                </label>
                <label>Bairro:
                    <input type="text" id="bairro" size="40" required>
                </label>
                <label>Cidade:
                    <input type="text" id="cidade" size="40" required>
                </label>
                <label>Estado:
                    <input type="text" id="uf" size="2" required>
                </label>
                <button type="submit">Calcular Frete e Finalizar Compra</button>
            </form>
            <div id="total-container">
                <p>Subtotal: R$ <span id="subtotal"></span></p>
                <p>Frete: R$ <span id="shipping"></span></p>
                <p>Total: R$ <span id="total"></span></p>
            </div>
        `;
        document.body.innerHTML = '';
        document.body.appendChild(checkoutContainer);

        this.renderCartSummary();
        this.updateTotals();
        this.setupEventListeners();
    }

    renderCartSummary() {
        const cartSummary = document.getElementById('cart-summary');
        cartSummary.innerHTML = this.cartItems.map(item => `
            <div class="cart-item">
                <img src="${item.product.image}" alt="${item.product.title}">
                <div>
                    <h4>${item.product.title}</h4>
                    <p>Quantidade: ${item.quantity}</p>
                    <p>Preço: R$ ${item.total.toFixed(2)}</p>
                </div>
            </div>
        `).join('');
    }

    updateTotals() {
        document.getElementById('subtotal').textContent = this.total.toFixed(2);
        document.getElementById('shipping').textContent = this.shipping.toFixed(2);
        document.getElementById('total').textContent = (this.total + this.shipping).toFixed(2);
    }

    setupEventListeners() {
        const cepInput = document.getElementById('cep');
        cepInput.addEventListener('blur', () => this.pesquisacep(cepInput.value));

        const addressForm = document.getElementById('address-form');
        addressForm.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    limpa_formulario_cep() {
        document.getElementById('rua').value = "";
        document.getElementById('bairro').value = "";
        document.getElementById('cidade').value = "";
        document.getElementById('uf').value = "";
    }

    meu_callback(conteudo) {
        if (!("erro" in conteudo)) {
            document.getElementById('rua').value = (conteudo.logradouro);
            document.getElementById('bairro').value = (conteudo.bairro);
            document.getElementById('cidade').value = (conteudo.localidade);
            document.getElementById('uf').value = (conteudo.uf);
            this.calculateShipping(conteudo.uf);
        } else {
            this.limpa_formulario_cep();
            alert("CEP não encontrado.");
        }
    }

    pesquisacep(valor) {
        var cep = valor.replace(/\D/g, '');

        if (cep !== "") {
            var validacep = /^[0-9]{8}$/;

            if(validacep.test(cep)) {document.getElementById('rua').value = "...";
                document.getElementById('bairro').value = "...";
                document.getElementById('cidade').value = "...";
                document.getElementById('uf').value = "...";

                var script = document.createElement('script');
                script.src = 'https://viacep.com.br/ws/'+ cep + '/json/?callback=checkoutPage.meu_callback';
                document.body.appendChild(script);
            } else {
                this.limpa_formulario_cep();
                alert("Formato de CEP inválido.");
            }
        } else {
            this.limpa_formulario_cep();
        }
    }

    calculateShipping(state) {
        const shippingRates = {
            'SP': 10,
            'RJ': 15,
            'MG': 20,
        };

        this.shipping = shippingRates[state] || 30;
        this.updateTotals();
    }

    handleSubmit(e) {
        e.preventDefault();
        alert('Compra finalizada com sucesso! Obrigado por sua compra.');
        window.location.href = 'index.html';
    }
}

window.checkoutPage = {
    meu_callback: function(conteudo) {
        if (window.currentCheckoutInstance) {
            window.currentCheckoutInstance.meu_callback(conteudo);
        }
    }
};

const productRepository = new ProductRepository();
const cartRepository = new CartRepository();
const shoppingCartUseCase = new ShoppingCartUseCase(productRepository, cartRepository);
const ui = new ShoppingCartUI(shoppingCartUseCase);

window.ui = ui;