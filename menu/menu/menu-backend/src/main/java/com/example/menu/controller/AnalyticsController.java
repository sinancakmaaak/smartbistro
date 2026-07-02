package com.example.menu.controller;

import com.example.menu.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/spoilage-risk")
    public ResponseEntity<List<AnalyticsService.SpoilageRiskReport>> getSpoilageRisk() {
        return ResponseEntity.ok(analyticsService.getSpoilageRiskAnalysis());
    }
}
