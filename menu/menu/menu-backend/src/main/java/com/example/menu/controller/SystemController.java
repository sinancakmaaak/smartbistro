package com.example.menu.controller;

import com.example.menu.config.DataSeeder;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/system")
@RequiredArgsConstructor
@Tag(name = "System", description = "Sistem ve Demo Veri Yönetimi")
public class SystemController {

    private final DataSeeder dataSeeder;

    @Operation(summary = "Demo verilerini yükler (var olan verileri ezmeden)")
    @PostMapping("/seed-demo")
    public ResponseEntity<String> seedDemoData() {
        try {
            dataSeeder.seedDemoData();
            return ResponseEntity.ok("Demo verileri başarıyla yüklendi.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Demo verileri yüklenirken hata oluştu: " + e.getMessage());
        }
    }
}
