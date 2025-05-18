// Price Comparison JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const priceForm = document.getElementById('price-comparison-form');
    const resultsContainer = document.getElementById('results-container');
    const loadingSpinner = document.getElementById('loading-spinner');
    const noResultsContainer = document.getElementById('no-results');
    const resultsTableContainer = document.getElementById('results-table-container');
    const notificationContainer = document.getElementById('notification-container');
    
    // Function to get CSRF token
    function getCSRFToken() {
        const token = document.querySelector('meta[name="csrf-token"]');
        if (token) {
            return token.getAttribute('content');
        }
        return null;
    }
    
    // Store the last search to avoid unnecessary API calls
    let lastSearch = {
        medicineName: '',
        location: '',
        timestamp: 0
    };

    if (priceForm) {
        priceForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const medicineName = document.getElementById('medicine-name').value.trim();
            const location = document.getElementById('location').value.trim();
            
            if (!medicineName) {
                showNotification('Please enter a medicine name', 'error');
                return;
            }
            
            const now = new Date().getTime();
            // Check if this is a duplicate search in the last 2 seconds
            if (medicineName === lastSearch.medicineName && 
                location === lastSearch.location && 
                (now - lastSearch.timestamp) < 2000) {
                showNotification('Please wait before searching again', 'info');
                return;
            }
            
            // Update the last search
            lastSearch = {
                medicineName,
                location,
                timestamp: now
            };
            
            // Reset previous results
            if (noResultsContainer) {
                noResultsContainer.style.display = 'none';
            }
            resultsContainer.style.display = 'block';
            loadingSpinner.style.display = 'block';
            resultsTableContainer.innerHTML = '';
            
            // Call the API
            fetchPriceComparison(medicineName, location);
        });
    }
    
    function fetchPriceComparison(medicineName, location) {
        // Add timestamp to prevent caching
        const timestamp = new Date().getTime();
        const csrfToken = getCSRFToken();
        
        // Prepare headers with CSRF token
        const headers = {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'X-Requested-With': 'XMLHttpRequest'
        };
        
        if (csrfToken) {
            headers['X-CSRFToken'] = csrfToken;
        }
        
        fetch(`/api/price_comparison?t=${timestamp}`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                medicine_name: medicineName,
                location: location || 'Unknown'
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            loadingSpinner.style.display = 'none';
            displayResults(data, medicineName, location);
        })
        .catch(error => {
            loadingSpinner.style.display = 'none';
            showNotification('Error fetching price data: ' + error.message, 'error');
        });
    }
    
    function displayResults(data, medicineName, location) {
        // Update search summary
        const summaryText = `Showing results for "${medicineName}" ${location ? 'near ' + location : ''}`;
        document.getElementById('summary-text').textContent = summaryText;
        
        if (!data.results || data.results.length === 0) {
            if (noResultsContainer) {
                noResultsContainer.style.display = 'block';
                noResultsContainer.innerHTML = `
                    <i class="fas fa-search"></i>
                    <p>No price information found for ${medicineName} ${location ? 'in ' + location : ''}.</p>
                    <p>Try a different medicine name or location.</p>
                `;
            } else {
                resultsTableContainer.innerHTML = `
                    <div class="no-results">
                        <p>No price information found for ${medicineName} ${location ? 'in ' + location : ''}.</p>
                        <p>Try a different medicine name or location.</p>
                    </div>`;
            }
            return;
        }
        
        // Create results table
        const table = document.createElement('table');
        table.className = 'results-table';
        
        // Create table header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Pharmacy</th>
                <th>Price</th>
                <th>Distance</th>
                <th>Availability</th>
                <th>Action</th>
            </tr>
        `;
        table.appendChild(thead);
        
        // Create table body
        const tbody = document.createElement('tbody');
        
        // Find the minimum price to highlight
        const minPrice = Math.min(...data.results.map(result => result.price));
        
        data.results.forEach(result => {
            const row = document.createElement('tr');
            
            // Set row class based on availability
            if (result.availability === 'In Stock') {
                row.className = 'in-stock';
            } else if (result.availability === 'Limited Stock') {
                row.className = 'limited-stock';
            } else {
                row.className = 'out-of-stock';
            }
            
            const isBestPrice = Math.abs(result.price - minPrice) < 0.01;
            
            row.innerHTML = `
                <td>
                    <div class="pharmacy-name">${result.pharmacy_name}</div>
                    <div class="pharmacy-address">${result.address}, ${result.city}</div>
                </td>
                <td class="price">
                    <span class="price-amount ${isBestPrice ? 'price-highlight' : ''}">₹${result.price.toFixed(2)}</span>
                    ${isBestPrice ? '<span class="price-tag">Best Price</span>' : ''}
                </td>
                <td>${result.distance ? result.distance + ' km' : 'N/A'}</td>
                <td class="availability">
                    <span class="availability-indicator ${result.availability.toLowerCase().replace(' ', '-')}">
                        ${result.availability}
                    </span>
                </td>
                <td class="actions">
                    <button class="btn btn-sm save-result" 
                            data-medicine="${medicineName}" 
                            data-pharmacy="${result.pharmacy_name}" 
                            data-price="${result.price.toFixed(2)}"
                            data-type="${result.medicine_type || 'General'}">
                        <i class="fas fa-bookmark"></i> Save
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        resultsTableContainer.appendChild(table);
        
        // Add medicine type info if available
        if (data.results.length > 0 && data.results[0].medicine_type) {
            const medicineInfoDiv = document.createElement('div');
            medicineInfoDiv.className = 'medicine-info';
            medicineInfoDiv.innerHTML = `
                <p><strong>Medicine Type:</strong> ${data.results[0].medicine_type}</p>
                <p class="price-range">Price Range: ₹${Math.min(...data.results.map(r => r.price)).toFixed(2)} - 
                                      ₹${Math.max(...data.results.map(r => r.price)).toFixed(2)}</p>
            `;
            resultsTableContainer.insertBefore(medicineInfoDiv, table);
        }
        
        // Add event listeners to save buttons
        document.querySelectorAll('.save-result').forEach(button => {
            button.addEventListener('click', function() {
                saveResult(
                    this.dataset.medicine, 
                    this.dataset.pharmacy, 
                    this.dataset.price,
                    this.dataset.type
                );
            });
        });
    }
    
    function saveResult(medicineName, pharmacyName, price, medicineType) {
        const csrfToken = getCSRFToken();
        
        // Prepare headers with CSRF token
        const headers = {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'X-Requested-With': 'XMLHttpRequest'
        };
        
        if (csrfToken) {
            headers['X-CSRFToken'] = csrfToken;
        }
        
        fetch('/api/save_price_result', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                medicine_name: medicineName,
                pharmacy_name: pharmacyName,
                price: parseFloat(price),
                medicine_type: medicineType
            })
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Please log in to save results');
                }
                throw new Error('Error saving result');
            }
            return response.json();
        })
        .then(data => {
            showNotification(data.message, 'success');
        })
        .catch(error => {
            showNotification(error.message, 'error');
        });
    }
    
    function showNotification(message, type) {
        if (!notificationContainer) {
            console.error('Notification container not found');
            return;
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Clear previous notifications
        notificationContainer.innerHTML = '';
        
        // Add new notification
        notificationContainer.appendChild(notification);
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 3000);
    }
});