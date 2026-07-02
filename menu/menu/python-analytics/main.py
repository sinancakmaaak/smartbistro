from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from sqlalchemy import create_engine
import datetime
import uvicorn
from typing import List, Dict, Any

app = FastAPI(title="Smart Bistro AI Analytics Engine")

# CORS Ayarları (Frontend erişimi için)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Veritabanı Bağlantısı
DB_URL = "mysql+pymysql://root:1234@localhost:3306/smart_bistro_db"
engine = create_engine(DB_URL)






def get_burn_rates_and_seasonality(engine):
    """
    Pandas ve veritabanı üzerinden günlük tüketim hızını (Burn Rate) 
    ve 7 günlük haftalık sezonsallık katsayılarını (Seasonality Factors) hesaplar.
    Optimized: Uses a single JOIN query and 30-day date limit.
    """
    ingredients_df = pd.read_sql("SELECT * FROM ingredients", engine)
    
    query = """
    SELECT 
        oi.product_id,
        oi.quantity,
        o.order_date,
        pi.ingredient_id,
        pi.amount_used
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN product_ingredients pi ON oi.product_id = pi.product_id
    WHERE o.order_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    """
    try:
        usage_df = pd.read_sql(query, engine)
    except Exception as e:
        print(f"Error querying SQL usage data: {e}")
        usage_df = pd.DataFrame()

    if usage_df.empty:
        burn_rates = pd.Series(0.0, index=ingredients_df['id'])
        seasonality_factors = pd.DataFrame(1.0, index=ingredients_df['id'], columns=range(7))
        return burn_rates, seasonality_factors

    usage_df['total_used'] = usage_df['quantity'] * usage_df['amount_used']
    
    # Baz Günlük Tüketim Hızı (Daily Burn Rate - son 30 günün ortalaması)
    burn_rates = usage_df.groupby('ingredient_id')['total_used'].sum() / 30.0
    
    # Haftanın Günlerine Göre Sezonsallık Analizi
    usage_df['order_date'] = pd.to_datetime(usage_df['order_date'])
    usage_df['day_of_week'] = usage_df['order_date'].dt.dayofweek
    
    # Her malzeme için haftanın her bir gününde yapılan toplam tüketim
    seasonality_factors = pd.DataFrame(1.0, index=ingredients_df['id'], columns=range(7))
    grouped = usage_df.groupby(['ingredient_id', 'day_of_week'])['total_used'].sum().unstack(fill_value=0.0)
    
    for ing_id in grouped.index:
        if ing_id not in seasonality_factors.index:
            continue
        row = grouped.loc[ing_id]
        row_sum = row.sum()
        if row_sum > 0:
            # Katsayıları normalleştiriyoruz: Her malzeme için 7 katsayının ortalaması 1.0 olacak şekilde
            # seasonality_factor = (günlük_tüketim / toplam_tüketim) * 7.0
            seasonality_factors.loc[ing_id] = (row / row_sum) * 7.0
            
    return burn_rates, seasonality_factors


@app.get("/api/analytics/spoilage-risk")
def get_spoilage_risk():
    """
    Haftalık sezonsallık katsayılarını kullanarak gün-gün FEFO tabanlı bozulma simülasyonu yapar.
    """
    try:
        batches_df = pd.read_sql("SELECT * FROM ingredient_batches WHERE remaining_quantity > 0", engine)
        ingredients_df = pd.read_sql("SELECT * FROM ingredients", engine)
        
        burn_rates, seasonality_factors = get_burn_rates_and_seasonality(engine)
        
        results = []
        today = datetime.date.today()
        
        for ing_id, burn_rate in burn_rates.items():
            ing_row = ingredients_df[ingredients_df['id'] == ing_id]
            if ing_row.empty: continue
            ing_name = ing_row['name'].values[0]
            ing_unit = ing_row['unit'].values[0]
            
            # Bu malzemenin partilerini SKT'ye göre diz (FEFO önceliği)
            ing_batches = batches_df[batches_df['ingredient_id'] == ing_id].copy()
            if ing_batches.empty: continue
            
            ing_batches['expiration_date'] = pd.to_datetime(ing_batches['expiration_date']).dt.date
            ing_batches = ing_batches.sort_values('expiration_date')
            
            total_waste = 0.0
            total_risk_val = 0.0
            consumed_so_far = 0.0
            
            # Kümülatif Günlük Simülasyon (Sezonsallık hariç)
            for _, batch in ing_batches.iterrows():
                days_to_expiry = (batch['expiration_date'] - today).days
                if days_to_expiry < 0: days_to_expiry = 0
                
                # Bu SKT tarihine kadar tüketim kapasitesini hesapla
                total_allowed_by_this_date = 0.0
                for d in range(1, days_to_expiry + 1):
                    future_date = today + datetime.timedelta(days=d)
                    dow = future_date.weekday()
                    weekly_factor = seasonality_factors.loc[ing_id, dow]
                    total_allowed_by_this_date += burn_rate * weekly_factor
                
                # Bu partiden ne kadar tüketebileceğimiz (kümülatif tüketim sınırını düşerek)
                can_eat_from_this_batch = max(0.0, total_allowed_by_this_date - consumed_so_far)
                
                actually_eaten = min(batch['remaining_quantity'], can_eat_from_this_batch)
                batch_waste = batch['remaining_quantity'] - actually_eaten
                
                if batch_waste > 0:
                    total_waste += batch_waste
                    total_risk_val += batch_waste * batch['unit_price']
                
                consumed_so_far += actually_eaten
            
            if total_waste > 0.1:
                results.append({
                    "ingredient": ing_name,
                    "daily_burn_rate": float(burn_rate),
                    "predicted_waste": float(total_waste),
                    "financial_risk_tl": float(total_risk_val),
                    "current_stock": float(ing_batches['remaining_quantity'].sum()),
                    "unit": ing_unit,
                    "earliest_expiry": ing_batches.iloc[0]['expiration_date'].strftime("%Y-%m-%d"),
                })
        
        # Karar destek açıklamaları ve önerileri
        for res in results:
            burn = res.get('daily_burn_rate', 0)
            waste = res.get('predicted_waste', 0)
            total_stock = res.get('current_stock', 0)
            unit = res.get('unit', '')
            
            if burn == 0:
                res['recommendation'] = f"DİKKAT: Henüz satış verisi yok. Stokların tamamı ({total_stock:.1f} {unit}) israf olabilir."
            elif waste > (total_stock * 0.5):
                res['recommendation'] = f"AŞIRI STOK RİSKİ: Günlük ortalama {burn:.2f} {unit} tüketim hızı, sezonsal talep dalgalanmalarına rağmen {total_stock:.1f} {unit} stoğu bitirmeye yetmiyor."
            elif waste > 0:
                res['recommendation'] = f"SKT YAKLAŞIYOR: Yakın tarihli partilerde {waste:.1f} {unit} risk altında. Sezonsal olarak eritilmesi önerilir."
            else:
                res['recommendation'] = f"GÜVENLİ: Tüketim hızı mevcut stokları SKT öncesi bitirmek için yeterli."
 
        return sorted(results, key=lambda x: x['financial_risk_tl'], reverse=True)
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/analytics/order-optimization")
def get_order_optimization():
    """
    Tedarik süresindeki günlerin haftalık sezonsallık katsayılarını hesaba katarak Akıllı Yeniden Sipariş Noktası (ROP) analizi yapar.
    """
    try:
        batches_df = pd.read_sql("SELECT * FROM ingredient_batches WHERE remaining_quantity > 0", engine)
        ingredients_df = pd.read_sql("SELECT * FROM ingredients", engine)
        
        burn_rates, seasonality_factors = get_burn_rates_and_seasonality(engine)
        
        results = []
        LEAD_TIME = 3       # Tedarik süresi varsayılan 3 gün
        SAFETY_FACTOR = 1.5  # %50 emniyet stoğu
        today = datetime.date.today()
        
        for _, ing in ingredients_df.iterrows():
            ing_id = ing['id']
            burn_rate = burn_rates.get(ing_id, 0.0)
            current_stock = batches_df[batches_df['ingredient_id'] == ing_id]['remaining_quantity'].sum()
            
            # Tedarik Süresi Talebi
            projected_lead_demand = 0.0
            for d in range(1, LEAD_TIME + 1):
                future_date = today + datetime.timedelta(days=d)
                dow = future_date.weekday()
                weekly_factor = seasonality_factors.loc[ing_id, dow]
                projected_lead_demand += burn_rate * weekly_factor
            
            reorder_point = projected_lead_demand * SAFETY_FACTOR
            
            status = "OK"
            if current_stock <= reorder_point:
                status = "REORDER_NOW"
            elif current_stock <= reorder_point * 1.5:
                status = "WATCHING"
                
            results.append({
                "ingredient": ing['name'],
                "current_stock": float(current_stock),
                "daily_burn_rate": float(burn_rate),
                "reorder_point": float(reorder_point),
                "status": status,
                "days_left": float(current_stock / burn_rate) if burn_rate > 0 else 999,
                "unit": ing['unit'],
            })
            
        return results
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/analytics/dynamic-menu-suggestions")
def get_dynamic_menu_suggestions():
    """
    Sezonsal israf simülasyonunu temel alarak indirimli ve öne çıkan AI Kampanya önerileri üretir.
    """
    try:
        batches_df = pd.read_sql("SELECT * FROM ingredient_batches WHERE remaining_quantity > 0", engine)
        ingredients_df = pd.read_sql("SELECT * FROM ingredients", engine)
        product_ingredients_df = pd.read_sql("SELECT * FROM product_ingredients", engine)
        products_df = pd.read_sql("SELECT * FROM products", engine)
        
        if product_ingredients_df.empty or products_df.empty:
            return []

        burn_rates, seasonality_factors = get_burn_rates_and_seasonality(engine)
        
        # Risk altındaki malzemeleri bul
        today = datetime.date.today()
        at_risk_ingredients = {}
        
        for ing_id, burn_rate in burn_rates.items():
            ing_row = ingredients_df[ingredients_df['id'] == ing_id]
            if ing_row.empty: continue
            ing_name = ing_row['name'].values[0]
            ing_unit = ing_row['unit'].values[0]
            
            ing_batches = batches_df[batches_df['ingredient_id'] == ing_id].copy()
            if ing_batches.empty: continue
            
            ing_batches['expiration_date'] = pd.to_datetime(ing_batches['expiration_date']).dt.date
            ing_batches = ing_batches.sort_values('expiration_date')
            
            total_waste = 0.0
            total_risk_val = 0.0
            consumed_so_far = 0.0
            
            # Simülasyon
            for _, batch in ing_batches.iterrows():
                days_to_expiry = (batch['expiration_date'] - today).days
                if days_to_expiry < 0: days_to_expiry = 0
                
                total_allowed_by_this_date = 0.0
                for d in range(1, days_to_expiry + 1):
                    future_date = today + datetime.timedelta(days=d)
                    dow = future_date.weekday()
                    weekly_factor = seasonality_factors.loc[ing_id, dow]
                    total_allowed_by_this_date += burn_rate * weekly_factor
                
                can_eat_from_this_batch = max(0.0, total_allowed_by_this_date - consumed_so_far)
                actually_eaten = min(batch['remaining_quantity'], can_eat_from_this_batch)
                batch_waste = batch['remaining_quantity'] - actually_eaten
                
                if batch_waste > 0:
                    total_waste += batch_waste
                    total_risk_val += batch_waste * batch['unit_price']
                
                consumed_so_far += actually_eaten
            
            if total_waste > 0.1:
                total_stock = ing_batches['remaining_quantity'].sum()
                at_risk_ingredients[ing_id] = {
                    "name": ing_name,
                    "unit": ing_unit,
                    "predicted_waste": total_waste,
                    "financial_risk_tl": total_risk_val,
                    "earliest_expiry": ing_batches.iloc[0]['expiration_date'].strftime("%Y-%m-%d"),
                    "waste_ratio": total_waste / total_stock if total_stock > 0 else 0
                }
        
        # Siparişleri ve sipariş kalemlerini çekerek ML geri bildirim analizi (Closed-Loop) yapıyoruz (7 günlük filtreli)
        orders_df = pd.read_sql("SELECT * FROM orders WHERE order_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)", engine)
        if orders_df.empty:
            order_items_df = pd.DataFrame(columns=['id', 'order_id', 'product_id', 'quantity', 'price_override', 'is_campaign'])
        else:
            order_ids = tuple(orders_df['id'].tolist())
            if len(order_ids) == 1:
                order_items_df = pd.read_sql(f"SELECT * FROM order_items WHERE order_id = {order_ids[0]}", engine)
            else:
                order_items_df = pd.read_sql(f"SELECT * FROM order_items WHERE order_id IN {order_ids}", engine)

        # Yeni eklenen kolonlar için geriye dönük uyumluluk ve güvenli okuma
        if 'is_campaign' not in order_items_df.columns:
            order_items_df['is_campaign'] = False
        else:
            def normalize_campaign(val):
                if isinstance(val, bytes):
                    return int.from_bytes(val, "big") != 0
                return bool(val)
            order_items_df['is_campaign'] = order_items_df['is_campaign'].apply(normalize_campaign)

        if 'price_override' not in order_items_df.columns:
            order_items_df['price_override'] = None

        suggestions = []
        
        # Sütun isimlendirmesini kontrol et ve normalize et (bit/byte tipini booleana dönüştürür)
        active_col = 'is_active' if 'is_active' in products_df.columns else 'isActive'
        if active_col in products_df.columns:
            def normalize_active(val):
                if isinstance(val, bytes):
                    return int.from_bytes(val, "big") != 0
                return bool(val)
            products_df[active_col] = products_df[active_col].apply(normalize_active)
            active_products = products_df[products_df[active_col] == True]
        else:
            active_products = products_df
            
        for _, prod in active_products.iterrows():
            prod_id = prod['id']
            prod_name = prod['name']
            prod_price = float(prod['price'])
            
            # Bu ürün için ML Kampanya Satış Performansı Analizi (Feedback Loop)
            sales_lift = 1.0
            campaign_sales_count = 0
            normal_sales_count = 0
            learning_decision = "İlk kampanya seansı. Başlangıç indirim oranı belirlendi."
            
            if not order_items_df.empty and not orders_df.empty:
                prod_sales = order_items_df[order_items_df['product_id'] == prod_id].copy()
                if not prod_sales.empty:
                    # Sipariş tarihi bilgisini bağla
                    prod_sales = prod_sales.merge(orders_df, left_on="order_id", right_on="id")
                    prod_sales['order_date'] = pd.to_datetime(prod_sales['order_date']).dt.date
                    
                    # Son 7 günün sipariş verisi
                    seven_days_ago = datetime.date.today() - datetime.timedelta(days=7)
                    prod_sales = prod_sales[prod_sales['order_date'] >= seven_days_ago]
                    
                    if not prod_sales.empty:
                        c_sales = prod_sales[prod_sales['is_campaign'] == True]
                        n_sales = prod_sales[prod_sales['is_campaign'] != True]
                        
                        campaign_sales_count = int(c_sales['quantity'].sum())
                        normal_sales_count = int(n_sales['quantity'].sum())
                        
                        c_days = c_sales['order_date'].nunique()
                        n_days = n_sales['order_date'].nunique()
                        
                        c_rate = campaign_sales_count / c_days if c_days > 0 else 0.0
                        n_rate = normal_sales_count / n_days if n_days > 0 else 0.0
                        
                        if c_rate > 0:
                            sales_lift = round(c_rate / (n_rate + 0.1), 2)
            
            prod_ingredients = product_ingredients_df[product_ingredients_df['product_id'] == prod_id]
            
            for _, pi in prod_ingredients.iterrows():
                ing_id = pi['ingredient_id']
                if ing_id in at_risk_ingredients:
                    risk_info = at_risk_ingredients[ing_id]
                    
                    # 1. Temel indirim oranı (Risk seviyesine göre)
                    if risk_info['waste_ratio'] > 0.5 or risk_info['financial_risk_tl'] > 150.0:
                        discount_percentage = 25
                        priority = "YÜKSEK"
                    else:
                        discount_percentage = 15
                        priority = "ORTA"
                        
                    # 2. ML Geri Bildirim Adaptasyonu (Closed-Loop)
                    if campaign_sales_count > 0:
                        if sales_lift < 1.3:
                            # Talep az, satışı artırmak için indirim oranını yükselt (maks %30)
                            discount_percentage = min(30, discount_percentage + 5)
                            learning_decision = f"Stok erimesi yavaş (Lift: x{sales_lift}). İndirim AI tarafından %{discount_percentage}'e yükseltildi."
                        elif sales_lift > 2.0:
                            # Stok çok hızlı eriyor, kâr marjını korumak için indirim oranını düşür (min %10)
                            discount_percentage = max(10, discount_percentage - 5)
                            learning_decision = f"Stok erimesi çok hızlı (Lift: x{sales_lift}). Kâr marjını korumak için indirim AI tarafından %{discount_percentage}'e düşürüldü."
                        else:
                            learning_decision = f"Talep dengeli (Lift: x{sales_lift}). İndirim oranı %{discount_percentage} olarak korundu."
                    else:
                        learning_decision = "İlk seans. Başlangıç indirim oranı uygulandı."
                        
                    discounted_price = round(prod_price * (1 - (discount_percentage / 100.0)), 2)
                    
                    recommendation = f"Bu enfes lezzet, son kullanma tarihi yaklaşan '{risk_info['name']}' malzemesini içermektedir. "
                    recommendation += f"Model Kararı: {learning_decision}"
                    
                    suggestions.append({
                        "productId": int(prod_id),
                        "productName": prod_name,
                        "originalPrice": prod_price,
                        "discountPercentage": discount_percentage,
                        "discountedPrice": discounted_price,
                        "riskIngredient": risk_info['name'],
                        "predictedWaste": float(risk_info['predicted_waste']),
                        "unit": risk_info['unit'],
                        "financialRisk": float(risk_info['financial_risk_tl']),
                        "recommendation": recommendation,
                        "priority": priority,
                        "salesLift": float(sales_lift),
                        "campaignSales": int(campaign_sales_count),
                        "normalSales": int(normal_sales_count),
                        "learningDecision": learning_decision
                    })
                    break
                    
        return suggestions
    except Exception as e:
        return {"error": str(e)}





if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
