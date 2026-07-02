package com.example.menu.service;

import com.example.menu.dto.RestaurantTableDto;
import com.example.menu.entity.RestaurantTable;
import com.example.menu.entity.Zone;
import com.example.menu.repository.RestaurantTableRepository;
import com.example.menu.repository.ZoneRepository;
import com.example.menu.repository.OrderRepository;
import com.example.menu.entity.Order;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RestaurantTableService {

    private final RestaurantTableRepository tableRepository;
    private final ZoneRepository zoneRepository;
    private final OrderRepository orderRepository;

    @Transactional(readOnly = true)
    public List<RestaurantTableDto> getAllTables() {
        return tableRepository.findByIsActiveTrue().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RestaurantTableDto> getTablesByZone(Long zoneId) {
        return tableRepository.findByZoneIdAndIsActiveTrue(zoneId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public RestaurantTableDto createTable(RestaurantTableDto dto) {
        Zone zone = zoneRepository.findById(dto.getZoneId())
                .orElseThrow(() -> new RuntimeException("Zone not found"));

        RestaurantTable table = new RestaurantTable();
        table.setTableNumber(dto.getTableNumber());
        table.setCapacity(dto.getCapacity());
        table.setStatus(dto.getStatus() == null ? "EMPTY" : dto.getStatus());
        table.setZone(zone);

        RestaurantTable saved = tableRepository.save(table);
        return mapToDto(saved);
    }

    @Transactional
    public void updateStatus(Long id, String status) {
        RestaurantTable table = tableRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Table not found"));
        table.setStatus(status);
        tableRepository.save(table);

        if ("EMPTY".equalsIgnoreCase(status)) {
            List<Order> activeOrders = orderRepository.findByRestaurantTableIdAndStatus(id, "ACTIVE");
            for (Order order : activeOrders) {
                order.setStatus("COMPLETED");
                orderRepository.save(order);
            }
        }
    }

    @Transactional
    public void deleteTable(Long id) {
        RestaurantTable table = tableRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Table not found"));
        table.setIsActive(false);
        tableRepository.save(table);
    }

    private RestaurantTableDto mapToDto(RestaurantTable table) {
        Double activeOrderAmount = 0.0;
        if ("OCCUPIED".equalsIgnoreCase(table.getStatus())) {
            List<Order> activeOrders = orderRepository.findByRestaurantTableIdAndStatus(table.getId(), "ACTIVE");
            activeOrderAmount = activeOrders.stream().mapToDouble(Order::getTotalAmount).sum();
        }

        return RestaurantTableDto.builder()
                .id(table.getId())
                .tableNumber(table.getTableNumber())
                .capacity(table.getCapacity())
                .status(table.getStatus())
                .zoneId(table.getZone().getId())
                .zoneName(table.getZone().getName())
                .isActive(table.getIsActive() != null && table.getIsActive())
                .activeOrderAmount(activeOrderAmount)
                .build();
    }
}
