package com.example.menu.config;

import com.example.menu.entity.RestaurantTable;
import com.example.menu.repository.RestaurantTableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final RestaurantTableRepository tableRepository;

    @Override
    public void run(String... args) throws Exception {
        // Fix for existing tables where isActive might be null/false initially
        // This is a one-time migration logic
        long count = tableRepository.count();
        if (count > 0) {
            // Fetch all tables (including non-active ones via findAll)
            List<RestaurantTable> allTables = tableRepository.findAll();
            for (RestaurantTable table : allTables) {
                // If we want to ensure all existing tables are active
                // For a migration, we can check a condition or just set all to true
                // We'll set them to true if they are not already set (or just set all)
                // In JPA, the boolean primitive defaults to false if not set, 
                // but the DB column might be NULL.
                // We'll just save them again to trigger the @Builder.Default or manual set
                if (table.getIsActive() == null || !table.getIsActive()) {
                    table.setIsActive(true);
                    tableRepository.save(table);
                }
            }
        }
    }
}
