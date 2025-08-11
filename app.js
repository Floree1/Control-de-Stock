document.addEventListener('DOMContentLoaded', () => {
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
            localStorage.removeItem('cart'); // Limpia el carrito al salir
            window.location.href = 'index.html';
        });
    }

    // --- LÓGICA DE DATOS (Carga y guardado) ---
    let products = JSON.parse(localStorage.getItem('products')) || [];
    let salesHistory = JSON.parse(localStorage.getItem('salesHistory')) || [];
    let cart = JSON.parse(localStorage.getItem('cart')) || []; // El carrito ahora se guarda en localStorage

    const saveProducts = () => localStorage.setItem('products', JSON.stringify(products));
    const saveSalesHistory = () => localStorage.setItem('salesHistory', JSON.stringify(salesHistory));
    const saveCart = () => localStorage.setItem('cart', JSON.stringify(cart));


    // --- LÓGICA DE LA PÁGINA DE INVENTARIO Y CARRITO (stock.html) ---
    const productList = document.getElementById('product-list');
    if (productList) {
        const cartItemsContainer = document.getElementById('cart-items');
        const cartFooter = document.getElementById('cart-footer');
        const checkoutButton = document.getElementById('checkout-button');

        // --- RENDERIZADO ---
        const renderProducts = () => {
            productList.innerHTML = '';
            products.forEach((product, index) => {
                const stockClass = product.stock <= 5 && product.stock > 0 ? 'low-stock' : '';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="${stockClass}">${product.name}</td>
                    <td>${product.serial}</td>
                    <td>${product.stock}</td>
                    <td>
                        <button class="btn-icon add-to-cart" data-index="${index}" title="Agregar al Pedido">
                            <i class="fa-solid fa-cart-plus"></i>
                        </button>
                        <button class="btn-icon delete" data-index="${index}" title="Eliminar Producto"><i class="fa-solid fa-trash-can"></i></button>
                    </td>
                `;
                productList.appendChild(tr);
            });
            document.querySelectorAll('.delete').forEach(btn => btn.addEventListener('click', e => deleteProduct(e.currentTarget.dataset.index)));
            document.querySelectorAll('.add-to-cart').forEach(btn => btn.addEventListener('click', e => addToCart(e.currentTarget.dataset.index)));
        };

        const renderCart = () => {
            cartItemsContainer.innerHTML = '';
            if (cart.length === 0) {
                cartItemsContainer.innerHTML = '<p style="text-align:center; color:#888;">El pedido está vacío.</p>';
                cartFooter.classList.add('hidden');
            } else {
                cart.forEach(item => {
                    const productInStock = products.find(p => p.serial === item.serial);
                    const maxStock = productInStock ? productInStock.stock + item.quantity : item.quantity; // Stock actual + lo que ya está en el carrito
                    
                    const cartItemDiv = document.createElement('div');
                    cartItemDiv.className = 'cart-item';
                    cartItemDiv.innerHTML = `
                        <div class="cart-item-details">
                            <p>${item.name}</p>
                            <small>Cód: ${item.serial}</small>
                        </div>
                        <div class="cart-item-quantity">
                            <input type="number" class="quantity-input" data-serial="${item.serial}" value="${item.quantity}" min="1" max="${maxStock}">
                        </div>
                        <button class="cart-item-remove" data-serial="${item.serial}" title="Quitar del pedido">&times;</button>
                    `;
                    cartItemsContainer.appendChild(cartItemDiv);
                });
                cartFooter.classList.remove('hidden');
            }
            document.querySelectorAll('.quantity-input').forEach(input => input.addEventListener('change', e => updateCartQuantity(e.target)));
            document.querySelectorAll('.cart-item-remove').forEach(btn => btn.addEventListener('click', e => removeFromCart(e.currentTarget.dataset.serial)));
        };

        // --- LÓGICA DEL CARRITO ---
        const addToCart = (index) => {
            const product = products[index];
            if (product.stock <= 0) {
                Swal.fire('Sin Stock', 'Este producto no tiene stock disponible.', 'error');
                return;
            }
            const existingItem = cart.find(item => item.serial === product.serial);
            if (existingItem) {
                Swal.fire('En el Pedido', 'Este producto ya está en el pedido. Puedes ajustar la cantidad allí.', 'info');
            } else {
                cart.push({ ...product, quantity: 1 }); // Añade el producto con cantidad 1
                saveCart();
                renderCart();
            }
        };

        const updateCartQuantity = (inputElement) => {
            const serial = inputElement.dataset.serial;
            let newQuantity = parseInt(inputElement.value);
            const productInStock = products.find(p => p.serial === serial);
            const cartItem = cart.find(item => item.serial === serial);

            if (newQuantity > productInStock.stock) {
                newQuantity = productInStock.stock;
                Swal.fire('Stock Insuficiente', `Solo quedan ${productInStock.stock} unidades de este producto.`, 'warning');
            }
            if (newQuantity < 1) {
                newQuantity = 1;
            }
            inputElement.value = newQuantity;
            cartItem.quantity = newQuantity;
            saveCart();
        };

        const removeFromCart = (serial) => {
            cart = cart.filter(item => item.serial !== serial);
            saveCart();
            renderCart();
        };

        // --- PROCESO DE VENTA (CHECKOUT) ---
        const sellModal = document.getElementById('sell-modal');
        checkoutButton.addEventListener('click', () => sellModal.style.display = 'block');
        sellModal.querySelector('.close-button').onclick = () => sellModal.style.display = 'none';
        window.onclick = (e) => { if (e.target == sellModal) sellModal.style.display = 'none'; };

        document.getElementById('sell-product-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const saleRecord = {
                items: cart.map(item => ({ name: item.name, serial: item.serial, quantity: item.quantity })),
                clientName: document.getElementById('client-name').value,
                clientAddress: document.getElementById('client-address').value,
                clientEmail: document.getElementById('client-email').value,
                clientPhone: document.getElementById('client-phone').value,
                paymentMethod: document.getElementById('payment-method').value,
                trackingCode: document.getElementById('tracking-code').value,
                shipped: false,
                saleDate: new Date().toISOString()
            };

            // Actualizar el stock de cada producto
            saleRecord.items.forEach(soldItem => {
                const productInStock = products.find(p => p.serial === soldItem.serial);
                if (productInStock) {
                    productInStock.stock -= soldItem.quantity;
                }
            });

            salesHistory.unshift(saleRecord);
            cart = []; // Limpiar el carrito

            saveProducts();
            saveSalesHistory();
            saveCart();
            renderProducts();
            renderCart();

            sellModal.style.display = 'none';
            document.getElementById('sell-product-form').reset();
            Swal.fire('¡Venta Finalizada!', 'La venta se ha registrado en el historial.', 'success');
        });

        // --- LÓGICA DE PRODUCTOS (Agregar/Eliminar) ---
        document.getElementById('add-product-form').addEventListener('submit', e => {
            e.preventDefault();
            const newProduct = { name: document.getElementById('product-name').value, serial: document.getElementById('product-serial').value, stock: parseInt(document.getElementById('product-stock').value) };
            if (products.some(p => p.serial === newProduct.serial)) {
                Swal.fire('Error', 'Ya existe un producto con ese código de serie.', 'error'); return;
            }
            products.push(newProduct);
            saveProducts(); renderProducts(); e.target.reset();
            Swal.fire('¡Éxito!', 'Producto agregado.', 'success');
        });
        
        const deleteProduct = (index) => {
            const productToDelete = products[index];
            if (cart.some(item => item.serial === productToDelete.serial)) {
                Swal.fire('Error', 'No puedes eliminar un producto que está en el pedido actual.', 'error');
                return;
            }
            Swal.fire({
                title: '¿Estás seguro?', text: `Esto eliminará "${productToDelete.name}" permanentemente.`,
                icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí, ¡eliminar!', cancelButtonText: 'Cancelar'
            }).then(result => {
                if (result.isConfirmed) {
                    products.splice(index, 1);
                    saveProducts(); renderProducts();
                    Swal.fire('¡Eliminado!', 'El producto ha sido eliminado.', 'success');
                }
            });
        };
        
        // Renderizado inicial
        renderProducts();
        renderCart();
    }

    // --- LÓGICA DE LA PÁGINA DE HISTORIAL (historial.html) ---
    const salesHistoryList = document.getElementById('sales-history-list');
    if (salesHistoryList) {
        const renderSalesHistory = () => {
            salesHistoryList.innerHTML = '';
            salesHistory.forEach((sale, index) => {
                const saleDate = new Date(sale.saleDate).toLocaleDateString('es-ES');
                const itemsHtml = `<ul class="sale-item-list">${sale.items.map(i => `<li>${i.quantity}x ${i.name}</li>`).join('')}</ul>`;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${saleDate}</td>
                    <td>${itemsHtml}</td>
                    <td>${sale.clientName}</td>
                    <td>${sale.clientAddress}</td>
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