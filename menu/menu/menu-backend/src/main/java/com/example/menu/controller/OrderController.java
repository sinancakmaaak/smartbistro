package com.example.menu.controller;

import com.example.menu.dto.OrderDTO;
import com.example.menu.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;


@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor

@Tag(name = "Order", description = "Sipariş ve Otomatik Stok Düşme İşlemleri")
public class OrderController {

    private final OrderService orderService;

    @Operation(summary = "Çoklu ürün içeren yeni bir sipariş girer, stokları düşer ve fişi kaydeder")
    @PostMapping
    public ResponseEntity<?> placeOrder(@RequestBody OrderDTO orderRequest) {
        try {
            OrderDTO response = orderService.placeOrder(orderRequest);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @Operation(summary = "Geçmişteki tüm siparişleri ve satışları listele")
    @GetMapping
    public List<OrderDTO> getAllOrders() {
        return orderService.getAllOrders();
    }

    @Operation(summary = "ID'ye göre tek bir siparişi getirir")
    @GetMapping("/{orderId}")
    public OrderDTO getOrderById(@PathVariable Long orderId) {
        return orderService.getOrderById(orderId);
    }

    @Operation(summary = "Siparişi günceller (Stoklar iade edilir ve yeniden hesaplanır)")
    @PutMapping("/{orderId}")
    public ResponseEntity<?> updateOrder(@PathVariable Long orderId, @RequestBody OrderDTO orderRequest) {
        try {
            OrderDTO response = orderService.updateOrder(orderId, orderRequest);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @Operation(summary = "Siparişi iptal eder ve stokları depoya iade eder")
    @DeleteMapping("/{orderId}")
    public void deleteOrder(@PathVariable Long orderId) {
        orderService.deleteOrder(orderId);
    }

    @Operation(summary = "Aktif masadaki siparişi başka bir masaya taşır ve masa durumlarını günceller")
    @PostMapping("/transfer")
    public ResponseEntity<?> transferTable(@RequestParam Long fromTableId, @RequestParam Long toTableId) {
        try {
            orderService.transferTable(fromTableId, toTableId);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @Operation(summary = "Masanın aktif siparişlerini listeler")
    @GetMapping("/table/{tableId}/active")
    public ResponseEntity<List<OrderDTO>> getActiveOrdersByTable(@PathVariable Long tableId) {
        return ResponseEntity.ok(orderService.getActiveOrdersByTable(tableId));
    }

    @Operation(summary = "Mutfak için henüz hazırlanmamış aktif siparişleri listeler")
    @GetMapping("/active-unprepared")
    public ResponseEntity<List<OrderDTO>> getActiveUnpreparedOrders() {
        return ResponseEntity.ok(orderService.getActiveUnpreparedOrders());
    }

    @Operation(summary = "Siparişi mutfakta hazırlandı olarak işaretler")
    @PostMapping("/{orderId}/prepare")
    public ResponseEntity<Void> markAsPrepared(@PathVariable Long orderId) {
        orderService.markAsPrepared(orderId);
        return ResponseEntity.ok().build();
    }
}
