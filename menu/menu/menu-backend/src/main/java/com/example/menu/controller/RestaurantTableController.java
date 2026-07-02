package com.example.menu.controller;

import com.example.menu.dto.RestaurantTableDto;
import com.example.menu.service.RestaurantTableService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tables")
@RequiredArgsConstructor
public class RestaurantTableController {

    private final RestaurantTableService tableService;

    @GetMapping
    public ResponseEntity<List<RestaurantTableDto>> getAllTables() {
        return ResponseEntity.ok(tableService.getAllTables());
    }

    @GetMapping("/zone/{zoneId}")
    public ResponseEntity<List<RestaurantTableDto>> getTablesByZone(@PathVariable Long zoneId) {
        return ResponseEntity.ok(tableService.getTablesByZone(zoneId));
    }

    @PostMapping
    public ResponseEntity<RestaurantTableDto> createTable(@RequestBody RestaurantTableDto tableDto) {
        return ResponseEntity.ok(tableService.createTable(tableDto));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Void> updateTableStatus(@PathVariable Long id, @RequestParam String status) {
        tableService.updateStatus(id, status);
        return ResponseEntity.ok().build();
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTable(@PathVariable Long id) {
        tableService.deleteTable(id);
        return ResponseEntity.ok().build();
    }
}
