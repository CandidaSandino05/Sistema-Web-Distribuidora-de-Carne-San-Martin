const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:4000/api'
  : 'https://sistema-web-distribuidora-de-carne-san.onrender.com/api';

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('san_martin_token')}`
  };
}