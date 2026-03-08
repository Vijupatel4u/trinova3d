// cart.js - Backend session only (no localStorage)

// cart.js update
function updateCartCount(count) {
  const dotElement = document.getElementById('cart-dot');
  if (dotElement) {
    if (count > 0) {
      dotElement.classList.remove('d-none');
    } else {
      dotElement.classList.add('d-none');
    }
  }
}
function addToCart(productId) {
  fetch(`/add-to-cart/${productId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      updateCartCount(data.cartCount);
      alert(data.message || 'Product added to cart!');
    } else {
      alert(data.message || 'Error adding to cart');
    }
  })
  .catch(err => {
    console.error('Add to cart error:', err);
    alert('Error adding to cart');
  });
}

// Load cart count on every page
document.addEventListener('DOMContentLoaded', () => {
  fetch('/cart/count')
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        updateCartCount(data.count);
      }
    })
    .catch(err => console.error('Cart count error:', err));
});