package com.example.menu.controller;

import com.example.menu.dto.WasteRecordDTO;
import com.example.menu.service.WasteRecordService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/waste-records")
@RequiredArgsConstructor
public class WasteRecordController {

    private final WasteRecordService wasteRecordService;

    @PostMapping
    public WasteRecordDTO recordWaste(@RequestBody WasteRecordDTO dto) {
        return wasteRecordService.recordWaste(dto);
    }

    @GetMapping
    public List<WasteRecordDTO> getAllWasteRecords() {
        return wasteRecordService.getAllWasteRecords();
    }

    @GetMapping("/summary")
    public Map<String, Object> getWasteSummary() {
        return wasteRecordService.getWasteSummary();
    }
}
