package com.example.menu.service;

import com.example.menu.dto.RestaurantTableDto;
import com.example.menu.dto.ZoneDto;
import com.example.menu.entity.Zone;
import com.example.menu.repository.ZoneRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ZoneService {

    private final ZoneRepository zoneRepository;

    @Transactional(readOnly = true)
    public List<ZoneDto> getAllZones() {
        return zoneRepository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ZoneDto getZoneById(Long id) {
        Zone zone = zoneRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Zone not found"));
        return mapToDto(zone);
    }

    @Transactional
    public ZoneDto createZone(ZoneDto dto) {
        Zone zone = new Zone();
        zone.setName(dto.getName());
        zone.setDescription(dto.getDescription());
        Zone saved = zoneRepository.save(zone);
        return mapToDto(saved);
    }

    private ZoneDto mapToDto(Zone zone) {
        List<RestaurantTableDto> tableDtos = null;
        if (zone.getTables() != null) {
            tableDtos = zone.getTables().stream()
                    .map(t -> RestaurantTableDto.builder()
                            .id(t.getId())
                            .tableNumber(t.getTableNumber())
                            .capacity(t.getCapacity())
                            .status(t.getStatus())
                            .zoneId(zone.getId())
                            .zoneName(zone.getName())
                            .build())
                    .collect(Collectors.toList());
        }

        return ZoneDto.builder()
                .id(zone.getId())
                .name(zone.getName())
                .description(zone.getDescription())
                .tables(tableDtos)
                .build();
    }
}
