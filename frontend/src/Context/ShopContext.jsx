import React, { createContext, useEffect, useState } from "react";

export const ShopContext = createContext(null);

const getDefaultCart = () => {
  let cart = {};
  for (let index = 0; index < 301; index++) {
    cart[index] = 0;
  }
  return cart;
};

const ShopContextProvider = (props) => {
  const [all_product, setAll_Product] = useState([]);
  const [cartItems, setCartItems] = useState(getDefaultCart());

  useEffect(() => {
    const fetchProductsAndCart = async () => {
      try {
        const productResponse = await fetch('http://localhost:4000/allproducts');
        const productData = await productResponse.json();
        setAll_Product(productData);

        const token = localStorage.getItem('auth-token');
        if (token) {
          const cartResponse = await fetch('http://localhost:4000/getcart', {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'auth-token': token,
              'Content-Type': 'application/json',
            },
            body: "",
          });
          const cartData = await cartResponse.json();
          console.log('Fetched cart data:', cartData); // Log fetched cart data
          setCartItems(cartData);
        }
      } catch (error) {
        console.error('Error fetching products or cart data:', error);
      }
    };

    fetchProductsAndCart();
  }, []);

  const addToCart = (itemId) => {
    setCartItems((prev) => ({ ...prev, [itemId]: prev[itemId] + 1 }));

    const token = localStorage.getItem('auth-token');
    if (token) {
      fetch('http://localhost:4000/addtocart', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'auth-token': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId: itemId }),
      })
        .then((response) => response.json())
        .then((data) => console.log(data))
        .catch((error) => console.error('Error adding to cart:', error));
    } else {
      console.error('No auth token found.');
    }
  };

  const removeFromCart = (itemId) => {
    setCartItems((prev) => ({ ...prev, [itemId]: prev[itemId] - 1 }));

    const token = localStorage.getItem('auth-token');
    if (token) {
      fetch('http://localhost:4000/removefromcart', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'auth-token': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId: itemId }),
      })
        .then((response) => response.json())
        .then((data) => console.log(data))
        .catch((error) => console.error('Error removing from cart:', error));
    } else {
      console.error('No auth token found.');
    }
  };

  const getTotalCartAmount = () => {
    let totalAmount = 0;
    for (const item in cartItems) {
      if (cartItems[item] > 0) {
        let itemInfo = all_product.find((product) => product.id === Number(item));
        if (itemInfo) { // Ensure itemInfo is defined before accessing its properties
          totalAmount += itemInfo.new_price * cartItems[item];
        }
      }
    }
    return totalAmount;
  };

  const getTotalCartItems = () => {
    let totalItem = 0;
    for (const item in cartItems) {
      if (cartItems[item] > 0) {
        totalItem += cartItems[item];
      }
    }
    console.log('Total items in cart:', totalItem); // Log total items in cart
    return totalItem;
  };

  const contextValue = {
    getTotalCartItems,
    getTotalCartAmount,
    all_product,
    cartItems,
    addToCart,
    removeFromCart,
  };

  return (
    <ShopContext.Provider value={contextValue}>
      {props.children}
    </ShopContext.Provider>
  );
};

export default ShopContextProvider;
