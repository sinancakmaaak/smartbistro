package com.example.menu.repository;

import com.example.menu.entity.RestaurantTable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RestaurantTableRepository extends JpaRepository<RestaurantTable, Long> {
    List<RestaurantTable> findByIsActiveTrue();
    List<RestaurantTable> findByZoneIdAndIsActiveTrue(Long zoneId);
    Optional<RestaurantTable> findByTableNumber(String tableNumber);
}
