package com.example.menu.service;

import com.example.menu.dto.OrderDTO;
import com.example.menu.dto.OrderItemDTO;
import com.example.menu.entity.*;
import com.example.menu.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final ProductRepository productRepository;
    private final IngredientRepository ingredientRepository;
    private final OrderRepository orderRepository;
    private final RestaurantTableRepository tableRepository;
    private final IngredientBatchRepository batchRepository;

    @Transactional
    public OrderDTO placeOrder(OrderDTO orderRequest) {
        RestaurantTable table = null;
        if (orderRequest.getTableId() != null) {
            table = tableRepository.findById(orderRequest.getTableId())
                    .orElseThrow(() -> new RuntimeException("Masa bulunamadı. ID: " + orderRequest.getTableId()));
            table.setStatus("OCCUPIED");
            tableRepository.save(table);
        }

        Order order = Order.builder()
                .orderDate(LocalDateTime.now())
                .totalAmount(0.0)
                .status("ACTIVE")
                .restaurantTable(table)
                .paymentMethod(orderRequest.getPaymentMethod() != null ? orderRequest.getPaymentMethod() : "KART")
                .isPrepared(false)
                .items(new ArrayList<>())
                .build();

        double totalAmount = 0.0;

        for (OrderItemDTO itemDto : orderRequest.getItems()) {
            Product product = productRepository.findById(itemDto.getProductId())
                    .orElseThrow(() -> new RuntimeException("Sipariş edilen ürün bulunamadı. ID: " + itemDto.getProductId()));

            if (!product.isActive()) {
                throw new RuntimeException("Ürün aktif değil (Menüden kaldırılmış). Sipariş verilemez: " + product.getName());
            }

            // FEFO Stock Deduction Logic
            for (ProductIngredient pi : product.getIngredients()) {
                Ingredient ingredient = pi.getIngredient();
                double totalRequired = pi.getAmountUsed() * itemDto.getQuantity();

                // Find all batches with stock, ordered by expiration date (ASC)
                List<IngredientBatch> batches = batchRepository.findByIngredientIdAndRemainingQuantityGreaterThanOrderByExpirationDateAsc(ingredient.getId(), 0.0);

                double availableTotal = batches.stream().mapToDouble(IngredientBatch::getRemainingQuantity).sum();

                if (availableTotal < totalRequired) {
                    throw new RuntimeException("Yetersiz Stok! Ürün: " + product.getName() +
                            ", Eksik Malzeme: " + ingredient.getName() +
                            " (Gereken: " + totalRequired + " " + ingredient.getUnit() +
                            ", Mevcut: " + availableTotal + " " + ingredient.getUnit() + ")");
                }

                // Deduct from batches
                double remainingToDeduct = totalRequired;
                for (IngredientBatch batch : batches) {
                    if (remainingToDeduct <= 0) break;

                    if (batch.getRemainingQuantity() >= remainingToDeduct) {
                        batch.setRemainingQuantity(batch.getRemainingQuantity() - remainingToDeduct);
                        remainingToDeduct = 0;
                    } else {
                        remainingToDeduct -= batch.getRemainingQuantity();
                        batch.setRemainingQuantity(0.0);
                    }
                    batchRepository.save(batch);
                }
            }

            boolean isCampaign = itemDto.getPriceOverride() != null;
            double unitPrice = isCampaign ? itemDto.getPriceOverride() : product.getPrice();
            double subTotal = unitPrice * itemDto.getQuantity();
            totalAmount += subTotal;

            OrderItem orderItem = OrderItem.builder()
                    .order(order)
                    .product(product)
                    .quantity(itemDto.getQuantity())
                    .subTotal(subTotal)
                    .priceOverride(itemDto.getPriceOverride())
                    .isCampaign(isCampaign)
                    .build();

            order.getItems().add(orderItem);
        }

        order.setTotalAmount(totalAmount);
        Order savedOrder = orderRepository.save(order);

        return convertToDTO(savedOrder);
    }

    public List<OrderDTO> getAllOrders() {
        return orderRepository.findAllWithItemsAndTable().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public OrderDTO getOrderById(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Sipariş bulunamadı. ID: " + orderId));
        return convertToDTO(order);
    }

    @Transactional
    public void deleteOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Sipariş bulunamadı. ID: " + orderId));
        
        // Note: For simplicity, we don't return stock to specific batches in this version.
        // In a real FEFO system, we'd need to track which batch the stock came from.
        
        orderRepository.delete(order);
    }

    @Transactional
    public OrderDTO updateOrder(Long orderId, OrderDTO orderRequest) {
        // Simplified update: Delete and re-place (caution: this doesn't handle stock correctly yet)
        deleteOrder(orderId);
        return placeOrder(orderRequest);
    }

    private OrderDTO convertToDTO(Order order) {
        List<OrderItemDTO> itemDTOs = order.getItems().stream()
                .map(item -> OrderItemDTO.builder()
                        .id(item.getId())
                        .productId(item.getProduct().getId())
                        .productName(item.getProduct().getName())
                        .quantity(item.getQuantity())
                        .subTotal(item.getSubTotal())
                        .priceOverride(item.getPriceOverride() != null ? item.getPriceOverride() : (item.getQuantity() > 0 ? item.getSubTotal() / item.getQuantity() : item.getProduct().getPrice()))
                        .build())
                .collect(Collectors.toList());

        return OrderDTO.builder()
                .id(order.getId())
                .orderDate(order.getOrderDate())
                .totalAmount(order.getTotalAmount())
                .status(order.getStatus())
                .tableId(order.getRestaurantTable() != null ? order.getRestaurantTable().getId() : null)
                .tableName(order.getRestaurantTable() != null ? order.getRestaurantTable().getTableNumber() : null)
                .paymentMethod(order.getPaymentMethod())
                .isPrepared(order.getIsPrepared() != null && order.getIsPrepared())
                .items(itemDTOs)
                .build();
    }

    @Transactional
    public void transferTable(Long fromTableId, Long toTableId) {
        RestaurantTable fromTable = tableRepository.findById(fromTableId)
                .orElseThrow(() -> new RuntimeException("Kaynak masa bulunamadı. ID: " + fromTableId));
        RestaurantTable toTable = tableRepository.findById(toTableId)
                .orElseThrow(() -> new RuntimeException("Hedef masa bulunamadı. ID: " + toTableId));

        List<Order> activeOrders = orderRepository.findByRestaurantTableIdAndStatus(fromTableId, "ACTIVE");
        if (activeOrders.isEmpty()) {
            throw new RuntimeException("Kaynak masada aktif bir sipariş bulunmamaktadır.");
        }

        for (Order order : activeOrders) {
            order.setRestaurantTable(toTable);
            orderRepository.save(order);
        }

        toTable.setStatus("OCCUPIED");
        tableRepository.save(toTable);

        fromTable.setStatus("EMPTY");
        tableRepository.save(fromTable);
    }

    @Transactional(readOnly = true)
    public List<OrderDTO> getActiveOrdersByTable(Long tableId) {
        return orderRepository.findByRestaurantTableIdAndStatus(tableId, "ACTIVE").stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public void markAsPrepared(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Sipariş bulunamadı. ID: " + orderId));
        order.setIsPrepared(true);
        if (order.getRestaurantTable() == null) {
            order.setStatus("COMPLETED");
        }
        orderRepository.save(order);
    }

    @Transactional(readOnly = true)
    public List<OrderDTO> getActiveUnpreparedOrders() {
        return orderRepository.findAllWithItemsAndTable().stream()
                .filter(o -> "ACTIVE".equalsIgnoreCase(o.getStatus()) && (o.getIsPrepared() == null || !o.getIsPrepared()))
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
}

