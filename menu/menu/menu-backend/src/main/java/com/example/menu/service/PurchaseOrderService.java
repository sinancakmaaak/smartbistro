package com.example.menu.service;

import com.example.menu.dto.PurchaseOrderDto;
import com.example.menu.dto.PurchaseOrderItemDto;
import com.example.menu.entity.Ingredient;
import com.example.menu.entity.IngredientBatch;
import com.example.menu.entity.PurchaseOrder;
import com.example.menu.entity.PurchaseOrderItem;
import com.example.menu.entity.Supplier;
import com.example.menu.repository.IngredientBatchRepository;
import com.example.menu.repository.IngredientRepository;
import com.example.menu.repository.PurchaseOrderRepository;
import com.example.menu.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PurchaseOrderService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final SupplierRepository supplierRepository;
    private final IngredientRepository ingredientRepository;
    private final IngredientBatchRepository batchRepository;

    @Transactional(readOnly = true)
    public List<PurchaseOrderDto> getAllPurchaseOrders() {
        return purchaseOrderRepository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public PurchaseOrderDto createPurchaseOrder(PurchaseOrderDto dto) {
        Supplier supplier = supplierRepository.findById(dto.getSupplierId())
                .orElseThrow(() -> new RuntimeException("Supplier not found"));

        PurchaseOrder order = PurchaseOrder.builder()
                .supplier(supplier)
                .orderDate(dto.getOrderDate() != null ? dto.getOrderDate() : LocalDateTime.now())
                .status(dto.getStatus() != null ? dto.getStatus() : "PENDING")
                .notes(dto.getNotes())
                .build();

        double totalAmount = 0.0;

        if (dto.getItems() != null) {
            for (PurchaseOrderItemDto itemDto : dto.getItems()) {
                Ingredient ingredient;
                if (itemDto.getIngredientId() != null && itemDto.getIngredientId() != 0) {
                    ingredient = ingredientRepository.findById(itemDto.getIngredientId())
                            .orElseThrow(() -> new RuntimeException("Ingredient not found"));
                } else if (itemDto.getIngredientName() != null && !itemDto.getIngredientName().isEmpty()) {
                    // Create new ingredient if not exists
                    ingredient = ingredientRepository.findByName(itemDto.getIngredientName())
                            .orElseGet(() -> {
                                Ingredient newIng = new Ingredient();
                                newIng.setName(itemDto.getIngredientName());
                                newIng.setUnit(itemDto.getUnit() != null ? itemDto.getUnit() : "kg");
                                newIng.setMinimumStockLevel(0.0);
                                newIng.setActive(true);
                                return ingredientRepository.save(newIng);
                            });
                } else {
                    throw new RuntimeException("Ingredient ID or Name must be provided");
                }

                double itemTotal = itemDto.getQuantity() * itemDto.getUnitPrice();
                totalAmount += itemTotal;

                PurchaseOrderItem item = PurchaseOrderItem.builder()
                        .purchaseOrder(order)
                        .ingredient(ingredient)
                        .quantity(itemDto.getQuantity())
                        .unitPrice(itemDto.getUnitPrice())
                        .unit(itemDto.getUnit())
                        .totalPrice(itemTotal)
                        .expirationDate(itemDto.getExpirationDate())
                        .build();

                order.getItems().add(item);
            }
        }
        order.setTotalAmount(totalAmount);
        
        PurchaseOrder savedOrder = purchaseOrderRepository.save(order);
        
        if ("COMPLETED".equals(savedOrder.getStatus())) {
            updateInventory(savedOrder);
        }

        return mapToDto(savedOrder);
    }

    @Transactional
    public PurchaseOrderDto updateOrderStatus(Long id, String status) {
        PurchaseOrder order = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Purchase order not found"));

        if ("PENDING".equals(order.getStatus()) && "COMPLETED".equals(status)) {
            updateInventory(order);
        }

        order.setStatus(status);
        return mapToDto(purchaseOrderRepository.save(order));
    }

    private void updateInventory(PurchaseOrder order) {
        for (PurchaseOrderItem item : order.getItems()) {
            Ingredient ingredient = item.getIngredient();
            
            // Intelligent Unit Conversion
            double normalizedQuantity = item.getQuantity();
            double normalizedUnitPrice = item.getUnitPrice();
            String baseUnit = ingredient.getUnit();
            String purchaseUnit = item.getUnit();

            if (baseUnit != null && purchaseUnit != null && !baseUnit.equalsIgnoreCase(purchaseUnit)) {
                // Weight Conversion
                if (baseUnit.equalsIgnoreCase("gr") && purchaseUnit.equalsIgnoreCase("kg")) {
                    normalizedQuantity = item.getQuantity() * 1000;
                    normalizedUnitPrice = item.getUnitPrice() / 1000;
                } else if (baseUnit.equalsIgnoreCase("kg") && purchaseUnit.equalsIgnoreCase("gr")) {
                    normalizedQuantity = item.getQuantity() / 1000;
                    normalizedUnitPrice = item.getUnitPrice() * 1000;
                }
                // Volume Conversion
                else if (baseUnit.equalsIgnoreCase("ml") && purchaseUnit.equalsIgnoreCase("lt")) {
                    normalizedQuantity = item.getQuantity() * 1000;
                    normalizedUnitPrice = item.getUnitPrice() / 1000;
                } else if (baseUnit.equalsIgnoreCase("lt") && purchaseUnit.equalsIgnoreCase("ml")) {
                    normalizedQuantity = item.getQuantity() / 1000;
                    normalizedUnitPrice = item.getUnitPrice() * 1000;
                }
            }

            // Create a new batch for each purchased item
            IngredientBatch batch = IngredientBatch.builder()
                    .ingredient(ingredient)
                    .quantity(normalizedQuantity)
                    .remainingQuantity(normalizedQuantity)
                    .unitPrice(normalizedUnitPrice)
                    .unit(baseUnit) // Always store in base unit
                    .receivedDate(LocalDateTime.now())
                    .expirationDate(item.getExpirationDate() != null ? item.getExpirationDate() : LocalDate.now().plusDays(30))
                    .build();
            
            batchRepository.save(batch);
        }
    }

    private PurchaseOrderDto mapToDto(PurchaseOrder order) {
        return PurchaseOrderDto.builder()
                .id(order.getId())
                .supplierId(order.getSupplier().getId())
                .supplierName(order.getSupplier().getName())
                .orderDate(order.getOrderDate())
                .totalAmount(order.getTotalAmount())
                .status(order.getStatus())
                .notes(order.getNotes())
                .items(order.getItems().stream().map(this::mapItemToDto).collect(Collectors.toList()))
                .build();
    }

    private PurchaseOrderItemDto mapItemToDto(PurchaseOrderItem item) {
        return PurchaseOrderItemDto.builder()
                .id(item.getId())
                .ingredientId(item.getIngredient().getId())
                .ingredientName(item.getIngredient().getName())
                .quantity(item.getQuantity())
                .unit(item.getIngredient().getUnit())
                .unitPrice(item.getUnitPrice())
                .totalPrice(item.getTotalPrice())
                .expirationDate(item.getExpirationDate())
                .build();
    }
}
