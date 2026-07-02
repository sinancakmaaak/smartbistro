# Smart Bistro AI Analytics Engine (main.py) Teknik Dokümantasyonu

Bu doküman, Smart Bistro projesinin makine öğrenmesi ve veri analitiği motorunu barındıran `python-analytics/main.py` dosyasındaki kod mimarisini, veri modellerini, algoritmaları ve matematiksel mantığı detaylı bir şekilde açıklamaktadır.

---

## 1. Genel Mimari ve Teknolojik Altyapı

Analitik motoru, **FastAPI** çatısı üzerinde koşan, arka planda **SQLAlchemy** ile veritabanına bağlanan ve veri analitiği işlemlerini **Pandas** kütüphanesi kullanarak gerçekleştiren yüksek performanslı hafif bir mikroservistir.

*   **Çalışma Adresi:** `http://localhost:8000`
*   **Veritabanı Sürücüsü:** `PyMySQL` (MySQL entegrasyonu için)
*   **Veri Analizi:** `Pandas` (Veri çerçeveleri - DataFrame ve seriler üzerinde hızlı gruplama, birleştirme ve matematiksel işlemler için)

---

## 2. Kütüphaneler ve Yapılandırma

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from sqlalchemy import create_engine
import datetime
import uvicorn
from typing import List, Dict, Any
```

*   **FastAPI / HTTPException:** REST API rotalarını tanımlamak ve hata durumlarında uygun HTTP durum kodlarını dönmek için kullanılır.
*   **CORSMiddleware:** React frontend uygulamasından (genellikle port 5173 veya farklı bir porttan) gelen isteklerin engellenmemesi (CORS politikası) için tüm kaynaklara (`*`) izin verir.
*   **pandas:** Veritabanından çekilen tabloları bellek üzerinde işlemek, SQL benzeri JOIN, GroupBy ve pivot işlemlerini yapmak için kullanılır.
*   **create_engine (SQLAlchemy):** MySQL veritabanı ile bağlantı kuran havuz yapısını oluşturur.

```python
DB_URL = "mysql+pymysql://root:1234@localhost:3306/smart_bistro_db"
engine = create_engine(DB_URL)
```
*   `engine` nesnesi, tüm Pandas veri okuma işlemlerinde (`pd.read_sql`) veritabanı sorgularını yürütmek için kullanılır.

---

## 3. Yardımcı Fonksiyon: Tüketim Hızı ve Sezonsallık Analizi

### `get_burn_rates_and_seasonality(engine)`

Sistemdeki en kritik yardımcı fonksiyondur. Son 30 günlük sipariş geçmişini analiz ederek malzemelerin **Günlük Tüketim Hızını (Daily Burn Rate)** ve **Haftalık Sezonsallık Katsayılarını (Seasonality Factors)** hesaplar.

#### Çalışma Akışı ve Veri Çekme:
Sistem son 30 günün sipariş kalemlerini, sipariş tarihlerini ve ürünlerin içerdiği malzemeleri tek bir JOIN sorgusu ile çeker:
```sql
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
```

#### Matematiksel Hesaplamalar:

1.  **Toplam Tüketim Miktarı:** 
    Satılan her ürünün miktarı (`quantity`) ile o üründe kullanılan malzeme miktarı (`amount_used`) çarpılarak malzeme bazında anlık tüketim bulunur:
    $$\text{Tüketim} = \text{Sipariş Adedi} \times \text{Reçetedeki Kullanım Miktarı}$$

2.  **Günlük Ortalama Tüketim Hızı (Daily Burn Rate):**
    Malzeme bazında son 30 günde yapılan toplam tüketim, gün sayısına (30) bölünerek günlük baz tüketim hızı ($R_{burn}$) bulunur:
    $$R_{burn} = \frac{\sum \text{Tüketilen Miktar}}{30}$$

3.  **Haftalık Sezonsallık Katsayısı (Seasonality Factor):**
    Sipariş tarihleri haftanın günlerine (`0` Pazartesi, `6` Pazar) göre gruplanır. Her malzemenin haftanın belirli bir gününde yaptığı toplam tüketim, o günün haftalık payına göre normalleştirilir:
    *   Her malzeme için 7 katsayının ortalaması **1.0** olacak şekilde ayarlanır.
    *   Formül:
        $$F_{weekly}(d) = \frac{\text{Gün } d\text{'deki Toplam Tüketim}}{\text{Haftalık Toplam Tüketim}} \times 7.0$$
    *   *Yorum:* Eğer $F_{weekly}(5) = 1.4$ ise, o malzeme Cumartesi günleri normal bir güne göre %40 daha fazla tüketilmektedir.

---

## 4. Rota 1: Bozulma Riski Analizi (Spoilage Risk)

### `/api/analytics/spoilage-risk`

Bu uç nokta, FEFO (İlk Son Kullanma Tarihi Gelen İlk Çıkar) yöntemini ve haftalık sezonsal katsayıları kullanarak gün-gün envanter erime simülasyonu yapar.

#### Simülasyon Algoritması:
1.  Eldeki aktif malzeme partileri (`ingredient_batches` tablosundaki miktarı > 0 olanlar) son kullanma tarihine göre en yakın olandan en uzak olana doğru sıralanır (FEFO önceliği).
2.  Her bir parti için bugün ile son kullanma tarihi arasındaki gün sayısı ($D_{expiry}$) hesaplanır.
3.  Simülasyon, o partinin son kullanma tarihine kadar geçecek her gün için gelecekteki sezonsal talebi hesaplar ve kümülatif olarak toplar:
    $$\text{Maksimum Tüketim Kapasitesi} = \sum_{d=1}^{D_{expiry}} R_{burn} \times F_{weekly}(d)$$
4.  **Tüketim Paylaştırma:** Eldeki stok bu kümülatif kapasiteden düşülür. Eğer partideki kalan miktar, son kullanma tarihine kadar tüketilebilecek tahmini miktardan fazla ise, aradaki fark **israf (waste)** olarak işaretlenir:
    $$\text{Tahmini İsraf} = \text{Parti Stok Miktarı} - \text{Tüketilebilecek Miktar}$$
5.  Finansal risk, israf miktarı ile partinin birim fiyatının çarpılmasıyla bulunur:
    $$\text{Finansal Risk (TL)} = \text{Tahmini İsraf} \times \text{Birim Fiyat}$$

#### Karar Destek ve Öneri Mantığı:
Simülasyon sonucunda ortaya çıkan israf miktarlarına göre sistem otomatik öneri metinleri üretir:
*   **Veri Yoksa:** *“DİKKAT: Henüz satış verisi yok. Stokların tamamı israf olabilir.”*
*   **Büyük İsraf Riski (> %50):** *“AŞIRI STOK RİSKİ: Günlük ortalama tüketim hızı, sezonsal talep dalgalanmalarına rağmen stoğu bitirmeye yetmiyor.”*
*   **Küçük İsraf Riski (> 0):** *“SKT YAKLAŞIYOR: Yakın tarihli partilerde risk altında malzeme var. Sezonsal olarak eritilmesi önerilir.”*
*   **Güvenli Durum (İsraf = 0):** *“GÜVENLİ: Tüketim hızı mevcut stokları SKT öncesi bitirmek için yeterli.”*

---

## 5. Rota 2: Akıllı Sipariş Optimizasyonu (Order Optimization)

### `/api/analytics/order-optimization`

Tedarik süresi boyunca oluşacak sezonsal talebi hesaba katarak envanterin ne zaman yeniden sipariş edilmesi gerektiğini belirleyen **ROP (Reorder Point - Yeniden Sipariş Noktası)** analizini yapar.

#### Hesaplama Mantığı:
Sistem sabit parametreler kullanır:
*   **Tedarik Süresi (Lead Time):** 3 Gün (Sipariş geçildikten sonra malzemenin dükkana ulaşma süresi).
*   **Emniyet Faktörü (Safety Factor):** 1.5 (%50 emniyet stoğu barındırır).

1.  **Tedarik Süresi Talebi ($D_{lead}$):**
    Bugünden başlayarak önümüzdeki 3 gün boyunca oluşacak toplam talep, günlerin haftalık sezonsal katsayıları hesaba katılarak hesaplanır:
    $$D_{lead} = \sum_{d=1}^{3} R_{burn} \times F_{weekly}(\text{Bugün} + d)$$
2.  **Yeniden Sipariş Noktası (Reorder Point - ROP):**
    Emniyet stoğu katsayısı ile tedarik süresi talebi çarpılarak bulunur:
    $$\text{ROP} = D_{lead} \times 1.5$$
3.  **Durum Belirleme:**
    Mevcut stok miktarı ile ROP karşılaştırılır:
    *   **Mevcut Stok $\le$ ROP:** Durum `REORDER_NOW` (Hemen Sipariş Ver)
    *   **ROP $<$ Mevcut Stok $\le$ ROP $\times 1.5$:** Durum `WATCHING` (Takip Et)
    *   **Mevcut Stok $>$ ROP $\times 1.5$:** Durum `OK` (Yeterli Stok)

---

## 6. Rota 3: Dinamik Menü ve Kampanya Önerileri (Dynamic Suggestions)

### `/api/analytics/dynamic-menu-suggestions`

Bu uç nokta, **Bozulma Riski Analizi** ile **Satış Performans Analizini** birleştiren kapalı devre (closed-loop) bir geri bildirim sistemi çalıştırır. Amacı, SKT'si yaklaşan malzemeleri içeren menü ürünlerine dinamik indirim oranları belirleyerek israfı önlemektir.

#### Adım 1: Riskli Malzemelerin Tespiti
Bozulma riski simülasyonu çalıştırılarak eldeki envanterin israf oranları (`waste_ratio`) ve finansal riskleri belirlenir.

#### Adım 2: Satış Artış (Sales Lift) Analizi
Son 7 günün sipariş verileri üzerinden kampanyalı satış performansı analiz edilir:
*   **Kampanyalı Satış Hızı ($CR_{sales}$):** Kampanyalı satış miktarı / kampanyanın aktif olduğu gün sayısı.
*   **Normal Satış Hızı ($NR_{sales}$):** Normal satış miktarı / normal gün sayısı.
*   **Sales Lift ($L_{sales}$):** $CR_{sales} / (NR_{sales} + 0.1)$

#### Adım 3: Karar Algoritması ve Adaptasyon
1.  **Başlangıç İndirimi:**
    *   İçerikteki riskli malzemenin israf oranı $>\%50$ veya finansal riski $>150$ TL ise başlangıç indirim oranı **%25** olur.
    *   Diğer durumlarda başlangıç indirim oranı **%15** olur.

2.  **Geri Bildirim Uyarısı (ML Kararı):**
    *   **Stok erimesi yavaşsa ($L_{sales} < 1.3$):** 
        Uygulanan indirim satışı yeterince tetiklememiştir. ML modeli indirim oranını **%5 artırır** (Maksimum %30 limitine kadar).
        $$\text{İndirim} = \min(30\%, \text{İndirim} + 5\%)$$
    *   **Stok erimesi çok hızlıysa ($L_{sales} > 2.0$):** 
        İndirim oranı nedeniyle aşırı talep oluşmuştur, gereksiz kar kaybını önlemek için ML modeli indirimi **%5 azaltır** (Minimum %10 limitine kadar).
        $$\text{İndirim} = \max(10\%, \text{İndirim} - 5\%)$$
    *   **Talep dengeliyse ($1.3 \le L_{sales} \le 2.0$):** 
        Talep hızı idealdir. İndirim oranı **sabit tutulur**.
    *   **Veri Yoksa (İlk Kampanya):** 
        `"İlk seans. Başlangıç indirim oranı uygulandı."` kararı verilir.

---

## 7. Servis Başlatma Bloğu

```python
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```
Python betiği doğrudan çalıştırıldığında (`python main.py`), FastAPI uygulamasını `0.0.0.0` (tüm ağ arayüzleri) üzerinden `8000` portunda yayınlayacak şekilde **Uvicorn** ASGI sunucusunu ayağa kaldırır.
