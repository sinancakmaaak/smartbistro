package com.example.menu.controller;

import com.example.menu.dto.ProductDTO;
import com.example.menu.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.List;
import java.util.Map;


@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor

@Tag(name = "Product", description = "Restoran Yemek/Ürün Yönetimi API'si")
public class ProductController {

    private final ProductService productService;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Operation(summary = "Ürün görseli yükler")
    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> uploadImage(@RequestParam("file") MultipartFile file) {
        try {
            File uploadFolder = new File(uploadDir);
            if (!uploadFolder.exists()) {
                uploadFolder.mkdirs();
            }
            String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename().replaceAll("\\s+", "_");
            Path filePath = Paths.get(uploadDir, fileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            String fileUrl = "http://localhost:8080/uploads/" + fileName;
            Map<String, String> response = new HashMap<>();
            response.put("url", fileUrl);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Dosya yüklenemedi: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @Operation(summary = "Aktif olan tüm ürünleri getirir")
    @GetMapping("/active")
    public List<ProductDTO> getActiveProducts() {
        return productService.getAllActiveProducts();
    }

    @Operation(summary = "ID'ye göre bir ürün getirir")
    @GetMapping("/{id}")
    public ProductDTO getProductById(@PathVariable Long id) {
        return productService.getProductById(id);
    }

    @Operation(summary = "Yeni bir ürün ekler")
    @PostMapping
    public ProductDTO createProduct(@RequestBody ProductDTO dto) {
        return productService.createProduct(dto);
    }

    @Operation(summary = "Mevcut bir ürünü günceller")
    @PutMapping("/{id}")
    public ProductDTO updateProduct(@PathVariable Long id, @RequestBody ProductDTO dto) {
        return productService.updateProduct(id, dto);
    }

    @Operation(summary = "Ürünün indirim oranını günceller")
    @PutMapping("/{id}/discount")
    public ProductDTO updateDiscount(@PathVariable Long id, @RequestParam Integer discountPercentage) {
        return productService.updateDiscount(id, discountPercentage);
    }

    @Operation(summary = "Bir ürünü siler ")
    @DeleteMapping("/{id}")
    public void deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
    }
}
