document.addEventListener('DOMContentLoaded', () => {
    // --- FUNCIÓN AUXILIAR PARA FORMATEAR MONEDA ---
    const formatCurrency = (value) => {
        if (typeof value !== 'number') {
            value = 0;
        }
        return value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
    };

    // --- LÓGICA DE LOGIN Y AUTENTICACIÓN ---
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', e => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            if (username === 'Admin' && password === 'Admin') {
                localStorage.setItem('isAuthenticated', 'true');
                window.location.href = 'stock.html';
            } else {
                document.getElementById('login-error').textContent = 'Usuario o contraseña incorrectos.';
            }
        });
    }

    const isAppPage = document.querySelector('.app-container');
    if (isAppPage) {
        if (localStorage.getItem('isAuthenticated') !== 'true') {
            window.location.href = 'index.html';
            return;
        }
        document.getElementById('logout-button').addEventListener('click', () => {
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('cart');
            window.location.href = 'index.html';
        });
    }

    // --- LÓGICA DE DATOS ---
    let products = JSON.parse(localStorage.getItem('products')) || [];
    let salesHistory = JSON.parse(localStorage.getItem('salesHistory')) || [];
    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    const saveProducts = () => localStorage.setItem('products', JSON.stringify(products));
    const saveSalesHistory = () => localStorage.setItem('salesHistory', JSON.stringify(salesHistory));
    const saveCart = () => localStorage.setItem('cart', JSON.stringify(cart));

    // --- LÓGICA DE LA PÁGINA DE INVENTARIO (stock.html) ---
    if (document.getElementById('product-list')) {
        const productList = document.getElementById('product-list');
        const addProductForm = document.getElementById('add-product-form');
        const cartItemsContainer = document.getElementById('cart-items');
        const cartFooter = document.getElementById('cart-footer');
        const cartTotalElement = document.getElementById('cart-total');
        const sellModal = document.getElementById('sell-modal');
        const sellProductForm = document.getElementById('sell-product-form');
        const checkoutButton = document.getElementById('checkout-button');

        // --- MANEJO DE PRODUCTOS ---
        addProductForm.addEventListener('submit', e => {
            e.preventDefault();
            const name = document.getElementById('product-name').value;
            const serial = document.getElementById('product-serial').value;
            const stock = parseInt(document.getElementById('product-stock').value, 10);
            const price = parseFloat(document.getElementById('product-price').value);

            // --- VALIDACIÓN CORREGIDA ---
            if (!name.trim() || !serial.trim()) {
                Swal.fire('Error', 'El nombre y el código de serie no pueden estar vacíos.', 'error');
                return;
            }
            if (isNaN(stock) || isNaN(price)) {
                Swal.fire('Error', 'El Stock y el Precio deben ser números válidos.', 'error');
                return;
            }
            if (products.some(p => p.serial === serial)) {
                Swal.fire('Error', 'Ya existe un producto con ese código de serie.', 'error');
                return;
            }

            const newProduct = { name, serial, stock, price };
            products.push(newProduct);
            saveProducts();
            renderProducts();
            e.target.reset();
            Swal.fire('¡Éxito!', 'Producto agregado correctamente.', 'success');
        });

        const deleteProduct = (index) => {
            const productToDelete = products[index];
            if (cart.some(item => item.serial === productToDelete.serial)) {
                Swal.fire('Error', 'No puedes eliminar un producto que está en el pedido actual.', 'error');
                return;
            }
            Swal.fire({
                title: '¿Estás seguro?',
                text: `Esto eliminará "${productToDelete.name}" permanentemente.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                confirmButtonText: 'Sí, ¡eliminar!',
                cancelButtonText: 'Cancelar'
            }).then(result => {
                if (result.isConfirmed) {
                    products.splice(index, 1);
                    saveProducts();
                    renderProducts();
                    Swal.fire('¡Eliminado!', 'El producto ha sido eliminado.', 'success');
                }
            });
        };

        const renderProducts = () => {
            productList.innerHTML = '';
            products.forEach((product, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="${product.stock <= 5 && product.stock > 0 ? 'low-stock' : ''}">${product.name}</td>
                    <td>${product.serial}</td>
                    <td>${product.stock}</td>
                    <td>${formatCurrency(product.price)}</td>
                    <td>
                        <button class="btn-icon add-to-cart" data-index="${index}" title="Agregar al Pedido"><i class="fa-solid fa-cart-plus"></i></button>
                        <button class="btn-icon delete" data-index="${index}" title="Eliminar Producto"><i class="fa-solid fa-trash-can"></i></button>
                    </td>
                `;
                productList.appendChild(tr);
            });
            document.querySelectorAll('.delete').forEach(btn => btn.addEventListener('click', e => deleteProduct(e.currentTarget.dataset.index)));
            document.querySelectorAll('.add-to-cart').forEach(btn => btn.addEventListener('click', e => addToCart(e.currentTarget.dataset.index)));
        };

        // --- MANEJO DEL CARRITO ---
        const addToCart = (index) => {
            const product = products[index];
            if (product.stock <= 0) { Swal.fire('Sin Stock', 'Este producto no tiene stock disponible.', 'error'); return; }
            if (cart.some(item => item.serial === product.serial)) { Swal.fire('En el Pedido', 'Este producto ya está en el pedido. Puedes ajustar la cantidad allí.', 'info'); return; }
            cart.push({ ...product, quantity: 1 });
            saveCart();
            renderCart();
        };

        const updateCartQuantity = (inputElement) => {
            const serial = inputElement.dataset.serial;
            const productInStock = products.find(p => p.serial === serial);
            const cartItem = cart.find(item => item.serial === serial);
            let newQuantity = parseInt(inputElement.value, 10);
            if (newQuantity > productInStock.stock) {
                newQuantity = productInStock.stock;
                Swal.fire('Stock Insuficiente', `Solo quedan ${productInStock.stock} unidades.`, 'warning');
            }
            if (newQuantity < 1 || isNaN(newQuantity)) {
                newQuantity = 1;
            }
            inputElement.value = newQuantity;
            cartItem.quantity = newQuantity;
            saveCart();
            renderCart();
        };

        const removeFromCart = (serial) => {
            cart = cart.filter(item => item.serial !== serial);
            saveCart();
            renderCart();
        };
        
        const renderCart = () => {
            cartItemsContainer.innerHTML = '';
            if (cart.length === 0) {
                cartItemsContainer.innerHTML = '<p style="text-align:center; color:#888;">El pedido está vacío.</p>';
                cartFooter.classList.add('hidden');
                return;
            }
            cart.forEach(item => {
                const cartItemDiv = document.createElement('div');
                cartItemDiv.className = 'cart-item';
                cartItemDiv.innerHTML = `
                    <div class="cart-item-details"><p>${item.name}</p><small>${formatCurrency(item.price)} c/u</small></div>
                    <div class="cart-item-quantity"><input type="number" class="quantity-input" data-serial="${item.serial}" value="${item.quantity}" min="1"></div>
                    <p><strong>${formatCurrency(item.price * item.quantity)}</strong></p>
                    <button class="cart-item-remove" data-serial="${item.serial}" title="Quitar del pedido">&times;</button>
                `;
                cartItemsContainer.appendChild(cartItemDiv);
            });
            const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            cartTotalElement.textContent = `Total: ${formatCurrency(total)}`;
            cartFooter.classList.remove('hidden');
            document.querySelectorAll('.quantity-input').forEach(input => input.addEventListener('change', e => updateCartQuantity(e.target)));
            document.querySelectorAll('.cart-item-remove').forEach(btn => btn.addEventListener('click', e => removeFromCart(e.currentTarget.dataset.serial)));
        };

        // --- MANEJO DEL CHECKOUT ---
        checkoutButton.addEventListener('click', () => {
            if (cart.length > 0) sellModal.style.display = 'block';
            else Swal.fire('Pedido Vacío', 'Agrega productos al pedido antes de finalizar la venta.', 'info');
        });
        sellModal.querySelector('.close-button').onclick = () => sellModal.style.display = 'none';
        window.addEventListener('click', (e) => { if (e.target == sellModal) sellModal.style.display = 'none'; });

        sellProductForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const totalSalePrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const saleRecord = {
                items: cart.map(item => ({ name: item.name, serial: item.serial, quantity: item.quantity, price: item.price })),
                clientName: document.getElementById('client-name').value,
                clientAddress: document.getElementById('client-address').value,
                clientEmail: document.getElementById('client-email').value,
                clientPhone: document.getElementById('client-phone').value,
                paymentMethod: document.getElementById('payment-method').value,
                trackingCode: document.getElementById('tracking-code').value,
                totalSalePrice,
                shipped: false,
                saleDate: new Date().toISOString()
            };
            saleRecord.items.forEach(soldItem => {
                const p = products.find(p => p.serial === soldItem.serial);
                if (p) p.stock -= soldItem.quantity;
            });
            salesHistory.unshift(saleRecord);
            cart = [];
            saveProducts();
            saveSalesHistory();
            saveCart();
            renderProducts();
            renderCart();
            sellModal.style.display = 'none';
            e.target.reset();
            Swal.fire('¡Venta Finalizada!', `El total de la venta fue ${formatCurrency(totalSalePrice)}.`, 'success');
        });

        // --- INICIALIZACIÓN ---
        renderProducts();
        renderCart();
    }

    // --- LÓGICA DE LA PÁGINA DE HISTORIAL (historial.html) ---
    if (document.getElementById('sales-history-list')) {
        const salesHistoryList = document.getElementById('sales-history-list');
        const renderSalesHistory = () => {
            salesHistoryList.innerHTML = '';
            salesHistory.forEach((sale, index) => {
                const saleDate = new Date(sale.saleDate).toLocaleDateString('es-AR');
                const itemsHtml = `<ul class="sale-item-list">${sale.items.map(i => `<li>${i.quantity}x ${i.name} (${formatCurrency(i.price)} c/u)</li>`).join('')}</ul>`;
                const clientInfo = `${sale.clientName}<br><small>${sale.clientEmail || ''}<br>${sale.clientPhone || ''}</small>`;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${saleDate}</td>
                    <td>${itemsHtml}</td>
                    <td>${clientInfo}</td>
                    <td><strong>${formatCurrency(sale.totalSalePrice)}</strong></td>
                    <td>${sale.paymentMethod}</td>
                    <td>${sale.trackingCode || 'N/A'}</td>
                    <td><input type="checkbox" class="shipped-check-history" data-index="${index}" ${sale.shipped ? 'checked' : ''}></td>
                `;
                salesHistoryList.appendChild(tr);
            });
            document.querySelectorAll('.shipped-check-history').forEach(check => {
                check.addEventListener('change', e => {
                    salesHistory[e.currentTarget.dataset.index].shipped = e.currentTarget.checked;
                    saveSalesHistory();
                });
            });
        };
        renderSalesHistory();
    }
});