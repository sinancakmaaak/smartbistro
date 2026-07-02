import axios from 'axios';

const BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const IngredientService = {
  getAllActive: async () => {
    const response = await api.get('/ingredients/active');
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get(`/ingredients/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/ingredients', data);
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await api.put(`/ingredients/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    await api.delete(`/ingredients/${id}`);
  },
  getExpired: async () => {
    const response = await api.get('/ingredients/expired');
    return response.data;
  },
};

export const ProductService = {
  getAllActive: async () => {
    const response = await api.get('/products/active');
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/products', data);
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await api.put(`/products/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    await api.delete(`/products/${id}`);
  },
  updateDiscount: async (id: number, discountPercentage: number) => {
    const response = await api.put(`/products/${id}/discount?discountPercentage=${discountPercentage}`);
    return response.data;
  },
};

export const OrderService = {
  placeOrder: async (data: any) => {
    const response = await api.post('/orders', data);
    return response.data;
  },
  getAll: async () => {
    const response = await api.get('/orders');
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await api.put(`/orders/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    await api.delete(`/orders/${id}`);
  },
  transferTable: async (fromTableId: number, toTableId: number) => {
    const response = await api.post(`/orders/transfer?fromTableId=${fromTableId}&toTableId=${toTableId}`);
    return response.data;
  },
  getActiveOrdersByTable: async (tableId: number) => {
    const response = await api.get(`/orders/table/${tableId}/active`);
    return response.data;
  },
  getActiveUnprepared: async () => {
    const response = await api.get('/orders/active-unprepared');
    return response.data;
  },
  markAsPrepared: async (id: number) => {
    const response = await api.post(`/orders/${id}/prepare`);
    return response.data;
  },
};

export const ZoneService = {
  getAll: async () => {
    const response = await api.get('/zones');
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/zones', data);
    return response.data;
  }
};

export const TableService = {
  getAll: async () => {
    const response = await api.get('/tables');
    return response.data;
  },
  getByZone: async (zoneId: number) => {
    const response = await api.get(`/tables/zone/${zoneId}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/tables', data);
    return response.data;
  },
  updateStatus: async (id: number, status: string) => {
    const response = await api.put(`/tables/${id}/status?status=${status}`);
    return response.data;
  },
  delete: async (id: number) => {
    await api.delete(`/tables/${id}`);
  }
};

export const WasteRecordService = {
  getAll: async () => {
    const response = await api.get('/waste-records');
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/waste-records', data);
    return response.data;
  },
  getSummary: async () => {
    const response = await api.get('/waste-records/summary');
    return response.data;
  }
};

export default api;
