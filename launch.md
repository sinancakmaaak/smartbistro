# Smart Bistro - Projeyi Çalıştırma Kılavuzu (Launch Guide)

Bu kılavuz, projenin 3 ana servisini (Backend, Frontend ve Python Analitik Motoru) terminal üzerinden Windows işletim sisteminde adım adım nasıl başlatacağınızı gösterir.

Bütün terminalleri açmak için projenin ana klasörü olan `menu latest` klasöründe olmanız gerekmektedir. 

---

## 🛠️ Ön Gereksinimler

Projenin başarıyla çalışması için bilgisayarınızda şu servislerin yüklü ve çalışır durumda olduğundan emin olun:
1. **MySQL Server:** Bilgisayarınızda MySQL sunucusunun çalışıyor olması gerekir. (Port: 3306, Kullanıcı: `root`, Şifre: `1234`). `smart_bistro_db` veritabanı backend başlatıldığında otomatik olarak kurulacaktır.

---

## 🚀 Adım Adım Çalıştırma Talimatları

Projenin tam kapasite çalışması için **3 ayrı terminal penceresi** açmalı ve aşağıdaki adımları sırasıyla uygulamalısınız.

### [Terminal 1] 🟢 Adım 1: Spring Boot Backend Servisini Başlatma
Bu servis projenin ana veritabanı beynidir. Port **8080** üzerinde çalışır.

1. Yeni bir PowerShell veya Komut İstemi (CMD) açın.
2. Aşağıdaki komutları sırasıyla yazarak backend dizinine gidin ve projeyi çalıştırın:
   ```powershell
   # 1. Backend klasörüne geçiş yapın
   cd "menu/menu-backend"

   # 2. Maven Wrapper kullanarak Spring Boot uygulamasını başlatın
   .\mvnw.cmd spring-boot:run
   ```
3. Terminalde `Started MenuApplication in ... seconds` mesajını gördüğünüzde backend başarıyla ayağa kalkmış demektir.

---

### [Terminal 2] 🟢 Adım 2: Python Analytics Engine (FastAPI) Başlatma
Bu servis DSS veri analizi ve tahmin motorudur. Port **8000** üzerinde çalışır.

1. İkinci bir terminal (PowerShell) penceresi açın.
2. Aşağıdaki komutları yazarak Python analitik motorunu sanal ortam (venv) üzerinden başlatın:
   ```powershell
   # 1. Python analitik dizinine geçiş yapın
   cd "menu/python-analytics"

   # 2. Sanal ortamdaki python yorumlayıcısı ile uygulamayı çalıştırın
   .\venv\Scripts\python.exe main.py
   ```
3. Terminalde `Uvicorn running on http://0.0.0.0:8000` mesajını gördüğünüzde veri tahmin motoru kullanıma hazırdır.

---

### [Terminal 3] 🟢 Adım 3: React Vite Frontend (Arayüz) Başlatma
Bu servis garsonların ve yöneticilerin kullandığı web arayüzüdür. Port **5173** üzerinde çalışır.

1. Üçüncü bir terminal penceresi açın.
2. Aşağıdaki komutları yazarak frontend uygulamasını başlatın:
   ```powershell
   # 1. Frontend dizinine geçiş yapın
   cd "menu/menu-frontend"

   # 2. Vite geliştirici sunucusunu çalıştırın
   npm run dev
   ```
3. Terminalde `➜ Local: http://localhost:5173/` çıktısını gördüğünüzde işlem tamamdır.

---

## 🎯 Uygulamaya Erişim

Tüm adımları tamamladıktan sonra tarayıcınızı açıp aşağıdaki adrese giderek uygulamayı kullanmaya başlayabilirsiniz:

👉 **[http://localhost:5173](http://localhost:5173)**

*Varsayılan kullanıcı bilgileri backend ilk çalıştığında veritabanına otomatik yüklenmiştir (DataSeeder).*
