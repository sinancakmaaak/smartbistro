package com.example.menu.config;

import com.example.menu.entity.*;
import com.example.menu.repository.*;
import com.example.menu.dto.WasteRecordDTO;
import com.example.menu.service.WasteRecordService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final ZoneRepository zoneRepository;
    private final RestaurantTableRepository tableRepository;
    private final CategoryRepository categoryRepository;
    private final IngredientRepository ingredientRepository;
    private final ProductRepository productRepository;
    private final SupplierRepository supplierRepository;
    private final IngredientBatchRepository batchRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final OrderRepository orderRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final WasteRecordRepository wasteRecordRepository;
    private final WasteRecordService wasteRecordService;

    @PersistenceContext
    private EntityManager entityManager;

    private final Random random = new Random();

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        try {
            entityManager.createNativeQuery("ALTER TABLE users MODIFY COLUMN role VARCHAR(50)").executeUpdate();
            entityManager.flush();
        } catch (Exception e) {
            System.out.println(">>> DDL Alter skipped: " + e.getMessage());
        }
        
        // Admin
        if (userRepository.findByEmail("admin@admin.com").isEmpty()) {
            userRepository.save(User.builder().firstName("Admin").lastName("User").email("admin@admin.com")
                    .password(passwordEncoder.encode("admin123")).role(Role.ADMIN).build());
        }

        // Mutfak Kullanıcısı (KITCHEN)
        if (userRepository.findByEmail("kitchen@bistro.com").isEmpty()) {
            userRepository.save(User.builder().firstName("Mutfak").lastName("Staff").email("kitchen@bistro.com")
                    .password(passwordEncoder.encode("kitchen123")).role(Role.KITCHEN).build());
        }
    }

    @Transactional
    public void seedDemoData() {
        System.out.println(">>> DEMO DATA SEEDER: İşlem Başladı...");
        
        // 1. Temel yapı ve Menü
        seedBasicStructure();
        seedMenuAndInitialStock();

        // 2. TÜM HAMMADDELER İÇİN FARKLI SKT'Lİ PARTİLER ÜRET (ZORLA)
        System.out.println(">>> Her hammadde için 3-4 farklı SKT'li partiler oluşturuluyor...");
        seedDeepInventory();
        
        // Zayiat verilerini seed et
        if (wasteRecordRepository.count() == 0) {
            System.out.println(">>> Zayiat verileri üretiliyor...");
            seedWasteRecords();
        }
        
        if (orderRepository.count() < 2500) {
            System.out.println(">>> Analiz verisi üretiliyor...");
            seedHistoricalData();
        }
        
        System.out.println(">>> DEMO DATA SEEDER: İşlem başarıyla tamamlandı.");
    }

    private void seedDeepInventory() {
        List<Ingredient> allIngredients = ingredientRepository.findAll();
        for (Ingredient ing : allIngredients) {
            // Sadece bu hammadde için hiç batch yoksa ekleme yapalım!
            if (batchRepository.findByIngredientId(ing.getId()).isEmpty()) {
                // Gerçekçi Fiyatlandırma Mantığı
                double basePrice = 50.0;
                String name = ing.getName().toLowerCase();
                
                if (name.contains("trüf") || name.contains("dana")) basePrice = 800.0 + random.nextDouble(1200.0);
                else if (name.contains("kıyma") || name.contains("tavuk") || name.contains("peynir")) basePrice = 300.0 + random.nextDouble(200.0);
                else if (name.contains("avokado") || name.contains("domates")) basePrice = 60.0 + random.nextDouble(40.0);
                else if (name.contains("makarna") || name.contains("ekmek")) basePrice = 25.0 + random.nextDouble(15.0);
                else basePrice = 40.0 + random.nextDouble(100.0);

                // 1. Kritik Parti (2-5 gün içinde ölecek) - İSRAF ANALİZİ İÇİN
                createBatch(ing, 10.0 + random.nextDouble(20.0), basePrice, LocalDate.now().plusDays(2 + random.nextInt(4)));
                
                // 2. Güvenli Parti (15-25 gün)
                createBatch(ing, 40.0 + random.nextDouble(60.0), basePrice * 0.95, LocalDate.now().plusDays(15 + random.nextInt(10)));
                
                // 3. Uzun Vadeli Parti (3-9 ay)
                createBatch(ing, 100.0 + random.nextDouble(200.0), basePrice * 0.9, LocalDate.now().plusMonths(3 + random.nextInt(6)));

                // 4. Son Kullanma Tarihi Geçmiş Parti (Bildirim ve Hızlı Zayiat Ekleme Desteği İçin)
                if (ing.getId() % 3 == 0) {
                    createBatch(ing, 2.0 + random.nextDouble(3.0), basePrice, LocalDate.now().minusDays(1 + random.nextInt(4)));
                }
            }
        }
    }

    private void seedBasicStructure() {
        Zone salon = zoneRepository.findByName("Ana Salon").orElseGet(() -> 
            zoneRepository.save(Zone.builder().name("Ana Salon").description("Ana Yemek Salonu").build()));
        
        if (tableRepository.findByTableNumber("S1").isEmpty()) {
            createTable("S1", 4, salon); createTable("S2", 2, salon);
            createTable("B1", 4, salon); createTable("B2", 6, salon);
        }
    }

    private void seedMenuAndInitialStock() {
        Category catMain = getOrCreateCategory("Ana Yemekler", 1);
        Category catPasta = getOrCreateCategory("Makarnalar", 2);
        Category catBurger = getOrCreateCategory("Burgerler", 3);
        Category catDrink = getOrCreateCategory("İçecekler", 4);

        Ingredient kiyma = getOrCreateIngredient("Dana Kıyma", "KG", 10.0);
        Ingredient tavuk = getOrCreateIngredient("Tavuk Göğsü", "KG", 10.0);
        Ingredient domates = getOrCreateIngredient("Domates", "KG", 5.0);
        Ingredient sogan = getOrCreateIngredient("Soğan", "KG", 5.0);
        Ingredient cheddar = getOrCreateIngredient("Cheddar Peyniri", "KG", 5.0);
        Ingredient makarna = getOrCreateIngredient("Penne Makarna", "KG", 20.0);
        Ingredient kola = getOrCreateIngredient("Kutu Kola", "ADET", 50.0);
        Ingredient avokado = getOrCreateIngredient("Avokado", "ADET", 10.0);
        Ingredient trufYagi = getOrCreateIngredient("Trüf Yağı", "LT", 1.0);

        // Ürünler ve Reçeteler
        upsertProduct("Özel Kasap Köfte", "Geleneksel", 320.0, catMain, List.of(new ProductIngredient(kiyma, 0.2), new ProductIngredient(domates, 0.05), new ProductIngredient(sogan, 0.03)));
        upsertProduct("Dev Burger", "Double Meat & Cheddar", 380.0, catBurger, List.of(new ProductIngredient(kiyma, 0.25), new ProductIngredient(cheddar, 0.04), new ProductIngredient(sogan, 0.02)));
        upsertProduct("Trüflü Penne", "Gurme Makarna", 450.0, catPasta, List.of(new ProductIngredient(makarna, 0.18), new ProductIngredient(trufYagi, 0.01)));
        upsertProduct("Avokado Salatası", "Taze", 260.0, catMain, List.of(new ProductIngredient(avokado, 0.5), new ProductIngredient(domates, 0.1)));
        upsertProduct("Tavuk Izgara", "Düşük Kalori", 280.0, catMain, List.of(new ProductIngredient(tavuk, 0.25)));
        upsertProduct("Kola", "Soğuk", 60.0, catDrink, List.of(new ProductIngredient(kola, 1.0)));

        if (supplierRepository.count() == 0) {
            createSupplier("Merkez Tedarik", "Ali Bey", "555-1111", "İstanbul", "merkez@tedarik.com");
        }
    }

    private void seedHistoricalData() {
        List<Product> products = productRepository.findAll();
        List<RestaurantTable> tables = tableRepository.findAll();
        LocalDateTime startDate = LocalDateTime.now().minusDays(30);

        for (int i = 0; i < 30; i++) {
            LocalDateTime currentDate = startDate.plusDays(i);
            int ordersToday = 25 + random.nextInt(15);
            if (currentDate.getDayOfWeek().getValue() >= 6) ordersToday += 15;

            for (int j = 0; j < ordersToday; j++) {
                Order order = Order.builder()
                        .restaurantTable(tables.get(random.nextInt(tables.size())))
                        .orderDate(currentDate.plusHours(random.nextInt(11) + 10))
                        .status("COMPLETED")
                        .items(new ArrayList<>())
                        .build();
                
                double total = 0;
                int itemsInOrder = 1 + random.nextInt(3);
                for (int k = 0; k < itemsInOrder; k++) {
                    Product p = products.get(random.nextInt(products.size()));
                    OrderItem item = OrderItem.builder().order(order).product(p).quantity(1 + random.nextInt(2)).build();
                    item.setSubTotal(p.getPrice() * item.getQuantity());
                    order.getItems().add(item);
                    total += item.getSubTotal();
                    deductStock(p, item.getQuantity());
                }
                order.setTotalAmount(total);
                orderRepository.save(order);
            }
        }
    }

    private void deductStock(Product p, int qty) {
        if (p.getIngredients() == null) return;
        for (ProductIngredient pi : p.getIngredients()) {
            double req = pi.getAmountUsed() * qty;
            List<IngredientBatch> batches = batchRepository.findByIngredientIdAndRemainingQuantityGreaterThanOrderByExpirationDateAsc(pi.getIngredient().getId(), 0.0);
            for (IngredientBatch b : batches) {
                if (req <= 0) break;
                if (b.getRemainingQuantity() >= req) {
                    b.setRemainingQuantity(b.getRemainingQuantity() - req); req = 0;
                } else {
                    req -= b.getRemainingQuantity(); b.setRemainingQuantity(0.0);
                }
                batchRepository.save(b);
            }
        }
    }

    private void upsertProduct(String name, String desc, Double price, Category cat, List<ProductIngredient> ingredients) {
        if (productRepository.findByName(name).isPresent()) {
            return; // Skip seeding if product already exists (to protect user's manual changes)
        }
        Product p = Product.builder()
                .name(name)
                .description(desc)
                .price(price)
                .category(cat)
                .isActive(true)
                .ingredients(new ArrayList<>(ingredients))
                .build();
        productRepository.save(p);
    }

    private Category getOrCreateCategory(String name, int order) {
        return categoryRepository.findByName(name).orElseGet(() -> 
            categoryRepository.save(Category.builder().name(name).displayOrder(order).build()));
    }

    private Ingredient getOrCreateIngredient(String name, String unit, Double minStock) {
        Ingredient ing = ingredientRepository.findByName(name).orElse(null);
        if (ing != null) {
            // Eğer birim gr'dan KG'ye dönüyorsa, mevcut stokları 1000'e bölmeliyiz
            if ("gr".equalsIgnoreCase(ing.getUnit()) && "KG".equalsIgnoreCase(unit)) {
                List<IngredientBatch> batches = batchRepository.findByIngredientId(ing.getId());
                for (IngredientBatch batch : batches) {
                    batch.setQuantity(batch.getQuantity() / 1000.0);
                    batch.setRemainingQuantity(batch.getRemainingQuantity() / 1000.0);
                    batch.setUnit("KG");
                    batchRepository.save(batch);
                }
            }
            ing.setUnit(unit);
            return ingredientRepository.save(ing);
        }
        return ingredientRepository.save(Ingredient.builder().name(name).unit(unit).minimumStockLevel(minStock).isActive(true).build());
    }

    private void createBatch(Ingredient i, Double qty, Double price, LocalDate expiry) {
        batchRepository.save(IngredientBatch.builder().ingredient(i).quantity(qty).remainingQuantity(qty)
                .unitPrice(price).unit(i.getUnit()).expirationDate(expiry).receivedDate(LocalDateTime.now().minusDays(31)).build());
    }

    private void createTable(String number, int capacity, Zone zone) {
        tableRepository.save(RestaurantTable.builder().tableNumber(number).capacity(capacity).status("EMPTY").zone(zone).isActive(true).build());
    }
    
    private void createSupplier(String name, String contact, String phone, String address, String email) {
        supplierRepository.save(Supplier.builder().name(name).contactPerson(contact).phone(phone).address(address).email(email).build());
    }

    private void seedWasteRecords() {
        Ingredient kiyma = ingredientRepository.findByName("Dana Kıyma").orElse(null);
        Ingredient domates = ingredientRepository.findByName("Domates").orElse(null);
        Ingredient avokado = ingredientRepository.findByName("Avokado").orElse(null);

        if (kiyma != null) {
            wasteRecordService.recordWaste(WasteRecordDTO.builder()
                    .ingredientId(kiyma.getId())
                    .quantity(1.2)
                    .reason("Expired")
                    .build());
        }
        if (domates != null) {
            wasteRecordService.recordWaste(WasteRecordDTO.builder()
                    .ingredientId(domates.getId())
                    .quantity(3.0)
                    .reason("Spoiled")
                    .build());
        }
        if (avokado != null) {
            wasteRecordService.recordWaste(WasteRecordDTO.builder()
                    .ingredientId(avokado.getId())
                    .quantity(2.0)
                    .reason("Spilled")
                    .build());
        }
    }
}
