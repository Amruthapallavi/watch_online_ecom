 
 function toggleOrderDetails(orderId) {
    const detailsDiv = document.getElementById(`details-${orderId}`);
    if (detailsDiv.style.display === 'none' || detailsDiv.style.display === '') {
        detailsDiv.style.display = 'block';
    } else {
        detailsDiv.style.display = 'none';
    }
}


function filterOrders() {
    const filter = document.getElementById("orderFilter").value;
    const orders = document.querySelectorAll(".order-item");

    orders.forEach(order => {
        const status = order.querySelector(".status").textContent.toLowerCase();
        if (filter === "all" || status.includes(filter)) {
            order.style.display = "block";
        } else {
            order.style.display = "none";
        }
    });
}

function toggleOrderDetails(orderId) {
    const detailsDiv = document.getElementById(`details-${orderId}`);
    if (detailsDiv.style.display === 'none') {
        detailsDiv.style.display = 'block';
    } else {
        detailsDiv.style.display = 'none';
    }
}


    

 
   

    // Function to update dashboard totals
    function updateDashboardData(totalSales, totalOrders, totalDiscount, activeUsers) {
        document.getElementById('totalSales').innerText = totalSales;
        document.getElementById('totalOrders').innerText = totalOrders;
        document.getElementById('totalDiscount').innerText = totalDiscount;
        document.getElementById('newUsers').innerText = activeUsers;
    }

   

    function generateReport() {
    const reportType = document.getElementById('reportType').value;
    let startDate = null;
    let endDate = null;
    const summaryDiv = document.querySelector('.summary1');
    summaryDiv.style.display = 'flex'; // Change to block to display it
    if (reportType === 'custom') {
        startDate = document.getElementById('startDate').value;
        endDate = document.getElementById('endDate').value;
    }

    // Fetch dashboard data from backend
    fetch('/dashboard-data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reportType, startDate, endDate }),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Received report data:', data);

        // Update the dashboard metrics
        updateDashboardData(
            `₹${data.totalSales.toLocaleString()}`, 
            data.totalOrders.toString(), 
            `₹${data.totalCouponDiscount.toLocaleString()}`, 
            parseFloat(data.totalOfferDiscount).toFixed(2) 
        );

        // Populate order details dynamically
        renderOrderList(data.orders); // Assuming `data.orders` is the array of orders from the backend
    });
}

function renderOrderList(orders) {
    const orderListContainer = document.querySelector('.order-list');
    orderListContainer.innerHTML = ''; // Clear existing orders

    // Loop through orders and generate HTML dynamically
    orders.forEach(order => {
        const orderItem = `
        <li class="order-item">
            <div class="order-header">
                <span class="order-id">${order.orderId}</span>
                 <span class="image"><img src="${order.image[0]}" alt="Product Image" class="product-image" />
</span>

                <span class="product-name">${order.product_name}</span>

                <span class="quantity">${order.quantity}</span>
                <span class="status">${order.productStatus}</span>
<span class="total">₹${order.offerPrice - (order.couponDiscount || 0).toFixed(2)}</span>
                <button class="more-btn" onclick="toggleOrderDetails('${order._id}')">More</button>
            </div>
            <div class="order-details" id="details-${order._id}" style="display: none;">
                <p><strong>Shipping Address:</strong> ${order.shippingAddress}</p>
                <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
                <button class="less-btn" onclick="toggleOrderDetails('${order._id}')">Less</button>
            </div>
        </li>
        `;
        orderListContainer.innerHTML += orderItem;
    });
}

function toggleOrderDetails(orderId) {
    const detailsDiv = document.getElementById(`details-${orderId}`);
    const isVisible = detailsDiv.style.display === 'block';
    detailsDiv.style.display = isVisible ? 'none' : 'block';
}

 
 
    //custom range
    document.getElementById('reportType').addEventListener('change', function() {
        const customRangeDiv = document.getElementById('customRange');
        customRangeDiv.style.display = this.value === 'custom' ? 'block' : 'none';
    });
    function downloadPDF() {
    const reportType = document.getElementById('reportType').value;
    let startDate = null;
    let endDate = null;

    if (reportType === 'custom') {
        startDate = document.getElementById('startDate').value;
        endDate = document.getElementById('endDate').value;
    }

    //  order details
    const orderItems = Array.from(document.querySelectorAll('.order-item')).map(item => {
        const orderId = item.querySelector('.order-id').textContent;
        const productId= item.querySelector('.product-id')
        const productName = item.querySelector('.product-name').textContent;
        const quantity = item.querySelector('.quantity').textContent;
        const status = item.querySelector('.status').textContent;
        const total = item.querySelector('.total').textContent;
        const shippingAddress = item.querySelector('.order-details') ? 
            item.querySelector('.order-details p strong').nextSibling.textContent : ''; // Extract shipping address
        const paymentMethod = item.querySelector('.order-details') ? 
            item.querySelector('.order-details p + p strong').nextSibling.textContent : ''; // Extract payment method

        return {
            orderId,
            productName,
            quantity,
            status,
            total,
            shippingAddress,
            paymentMethod
        };
    });

    window.location.href = `/download/pdf?reportType=${reportType}&startDate=${startDate}&endDate=${endDate}&orders=${JSON.stringify(orderItems)}`;
}

function downloadExcel() {
    const reportType = document.getElementById('reportType').value;
    let startDate = null;
    let endDate = null;

    if (reportType === 'custom') {
        startDate = document.getElementById('startDate').value;
        endDate = document.getElementById('endDate').value;
    }

    // Gather order details
    const orderItems = Array.from(document.querySelectorAll('.order-item')).map(item => {
        const orderId = item.querySelector('.order-id').textContent;
        const productName = item.querySelector('.product-name').textContent;
        const quantity = item.querySelector('.quantity').textContent;
        const status = item.querySelector('.status').textContent;
        const total = item.querySelector('.total').textContent;
        const shippingAddress = item.querySelector('.order-details') ? 
            item.querySelector('.order-details p strong').nextSibling.textContent : ''; // Extract shipping address
        const paymentMethod = item.querySelector('.order-details') ? 
            item.querySelector('.order-details p + p strong').nextSibling.textContent : ''; // Extract payment method

        return {
            orderId,
            productName,
            quantity,
            status,
            total,
            shippingAddress,
            paymentMethod
        };
    });

    window.location.href = `/download/excel?reportType=${reportType}&startDate=${startDate}&endDate=${endDate}&orders=${JSON.stringify(orderItems)}`;
}

 
 
    const categorySalesData = <%- JSON.stringify(categorySales) %>;
    const paymentMethodsData = <%- JSON.stringify(paymentMethods) %>;

    const categoryNames = categorySalesData.map(item => item.cname); // Extract category names
    const categorySales = categorySalesData.map(item => item.totalSales); // Extract total sales

    // Extract data for Payment Methods Chart
    const paymentMethods = paymentMethodsData.map(item => item.method); // Extract payment method names
    const paymentCounts = paymentMethodsData.map(item => item.count); // Extract the count of each method used

    // Create Category Sales Chart
    const categorySalesCtx = document.getElementById('categorySalesChart').getContext('2d');
    new Chart(categorySalesCtx, {
        type: 'bar', // Choose bar chart
        data: {
            labels: categoryNames, // X-axis labels
            datasets: [{
                label: 'Total Sales by Category',
                data: categorySales, // Y-axis data
                backgroundColor: 'rgba(54, 162, 235, 0.2)', // Bar color
                borderColor: 'rgba(54, 162, 235, 1)', // Border color
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Create Payment Methods Chart
    const paymentMethodsCtx = document.getElementById('paymentMethodsChart').getContext('2d');
    new Chart(paymentMethodsCtx, {
        type: 'pie', // Choose pie chart
        data: {
            labels: paymentMethods, // X-axis labels
            datasets: [{
                label: 'Payment Methods Used',
                data: paymentCounts, // Y-axis data
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(54, 162, 235, 0.2)',
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(153, 102, 255, 0.2)'
                ], // Pie slice colors
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
        }
    });


    let currentOrderIndex = 5; // Start after the first 5 orders

function showMoreOrders() {
    const orderList = document.getElementById('orderList');
    const orders = <%- JSON.stringify(orders) %>; // Pass orders to JavaScript
    const moreOrdersCount = orders.length;

    // Display the next set of orders
    const endIndex = currentOrderIndex + 5; // Show 5 more orders
    for (let i = currentOrderIndex; i < endIndex && i < moreOrdersCount; i++) {
        const order = orders[i];
        const orderItem = document.createElement('li');
        orderItem.className = 'order-item';
        orderItem.innerHTML = `
            <div class="order-header">
                <span class="order-id">${order.orderId}</span>
                <span class="image" style="max-width: 100px; max-height: 100px;">
                    <img src="${order.image[0]}" alt="${order.product_name}" class="product-image">
                </span>
                <span class="product-name">${order.product_name}</span>
                <span class="quantity">${order.quantity}</span>
                <span class="status">${order.productStatus}</span>
                <span class="total">₹${(order.offerPrice - (order.couponDiscount || 0)).toFixed(2)}</span>
                <button class="more-btn" onclick="toggleOrderDetails('${order.order_id}')">More</button>
            </div>
            <div class="order-details" id="details-${order.order_id}" style="display: none;">
                <p><strong>Shipping Address:</strong> ${order.shippingAddress.house_no}, ${order.shippingAddress.street}</p>
                <p>${order.shippingAddress.locality}, ${order.shippingAddress.city}, ${order.shippingAddress.district}</p>
                <p>${order.shippingAddress.state}, ${order.shippingAddress.pincode}</p>
                <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
                <button class="less-btn" onclick="toggleOrderDetails('${order.order_id}')">Less</button>
            </div>
        `;
        orderList.appendChild(orderItem);
    }

    currentOrderIndex += 5; // Update the index for the next batch

    // Hide the button if there are no more orders to display
    if (currentOrderIndex >= moreOrdersCount) {
        document.getElementById('more-orders').style.display = 'none';
    }
}

 
 
    const expand_btn = document.querySelector(".expand-btn");

let activeIndex;

expand_btn.addEventListener("click", () => {
  document.body.classList.toggle("collapsed");
});

const current = window.location.href;

const allLinks = document.querySelectorAll(".sidebar-links a");

allLinks.forEach((elem) => {
  elem.addEventListener("click", function () {
    const hrefLinkClick = elem.href;

    allLinks.forEach((link) => {
      if (link.href == hrefLinkClick) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  });
});

const searchInput = document.querySelector(".search__wrapper input");

searchInput.addEventListener("focus", (e) => {
  document.body.classList.remove("collapsed");
});
 