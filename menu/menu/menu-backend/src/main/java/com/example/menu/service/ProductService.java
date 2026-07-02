package com.example.menu.service;

import com.example.menu.dto.ProductDTO;
import com.example.menu.dto.ProductIngredientDTO;
import com.example.menu.entity.Category;
import com.example.menu.entity.Product;
import com.example.menu.entity.Ingredient;
import com.example.menu.entity.ProductIngredient;
import com.example.menu.repository.CategoryRepository;
import com.example.menu.repository.ProductRepository;
import com.example.menu.repository.IngredientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final IngredientRepository ingredientRepository;

    public List<ProductDTO> getAllActiveProducts() {
        return productRepository.findAllByIsActiveTrue()
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public ProductDTO getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));
        return convertToDTO(product);
    }

    @Transactional
    public ProductDTO createProduct(ProductDTO dto) {
        Category category = null;
        if (dto.getCategoryId() != null) {
            category = categoryRepository.findById(dto.getCategoryId())
                    .orElseThrow(() -> new RuntimeException("Category not found"));
        }

        Product product = Product.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .imageUrl(dto.getImageUrl())
                .price(dto.getPrice())
                .category(category)
                .discountPercentage(dto.getDiscountPercentage() != null ? dto.getDiscountPercentage() : 0)
                .isActive(true)
                .ingredients(new ArrayList<>())
                .build();
        
        if (dto.getIngredients() != null) {
            for (ProductIngredientDTO ingDto : dto.getIngredients()) {
                Ingredient ingredient = ingredientRepository.findById(ingDto.getIngredientId())
                        .orElseThrow(() -> new RuntimeException("Ingredient not found: " + ingDto.getIngredientId()));
                ProductIngredient pi = ProductIngredient.builder()
                        .ingredient(ingredient)
                        .amountUsed(ingDto.getAmountUsed())
                        .build();
                product.getIngredients().add(pi);
            }
        }
        
        Product savedProduct = productRepository.save(product);
        return convertToDTO(savedProduct);
    }

    @Transactional
    public ProductDTO updateProduct(Long id, ProductDTO dto) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));

        product.setName(dto.getName());
        product.setDescription(dto.getDescription());
        product.setImageUrl(dto.getImageUrl());
        product.setPrice(dto.getPrice());
        if (dto.getDiscountPercentage() != null) {
            product.setDiscountPercentage(dto.getDiscountPercentage());
        }
        
        if (dto.getCategoryId() != null) {
            Category category = categoryRepository.findById(dto.getCategoryId())
                    .orElseThrow(() -> new RuntimeException("Category not found"));
            product.setCategory(category);
        } else {
            product.setCategory(null);
        }
        
        if (dto.getIngredients() != null) {
            product.getIngredients().clear();
            for (ProductIngredientDTO ingDto : dto.getIngredients()) {
                Ingredient ingredient = ingredientRepository.findById(ingDto.getIngredientId())
                        .orElseThrow(() -> new RuntimeException("Ingredient not found: " + ingDto.getIngredientId()));
                ProductIngredient pi = ProductIngredient.builder()
                        .ingredient(ingredient)
                        .amountUsed(ingDto.getAmountUsed())
                        .build();
                product.getIngredients().add(pi);
            }
        }
        
        Product updatedProduct = productRepository.save(product);
        return convertToDTO(updatedProduct);
    }

    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));
        product.setActive(false);
        productRepository.save(product);
    }

    public ProductDTO updateDiscount(Long id, Integer discountPercentage) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));

        if (discountPercentage == null || discountPercentage < 0 || discountPercentage > 100) {
            throw new IllegalArgumentException("Invalid discount percentage: " + discountPercentage);
        }
        product.setDiscountPercentage(discountPercentage);
        Product updatedProduct = productRepository.save(product);
        return convertToDTO(updatedProduct);
    }

    private ProductDTO convertToDTO(Product product) {
        List<ProductIngredientDTO> ingredientDTOs = null;
        if (product.getIngredients() != null && !product.getIngredients().isEmpty()) {
            ingredientDTOs = product.getIngredients().stream().map(pi -> ProductIngredientDTO.builder()
                    .ingredientId(pi.getIngredient().getId())
                    .ingredientName(pi.getIngredient().getName())
                    .amountUsed(pi.getAmountUsed())
                    .unit(pi.getIngredient().getUnit())
                    .build()).collect(Collectors.toList());
        }

        Integer discountPct = product.getDiscountPercentage() != null ? product.getDiscountPercentage() : 0;
        Double discountedPrice = product.getPrice();
        if (discountPct > 0) {
            discountedPrice = Math.round(product.getPrice() * (1.0 - discountPct / 100.0) * 100.0) / 100.0;
        }

        return ProductDTO.builder()
                .id(product.getId())
                .name(product.getName())
                .description(product.getDescription())
                .imageUrl(product.getImageUrl())
                .price(product.getPrice())
                .categoryId(product.getCategory() != null ? product.getCategory().getId() : null)
                .categoryName(product.getCategory() != null ? product.getCategory().getName() : null)
                .isActive(product.isActive())
                .discountPercentage(discountPct)
                .discountedPrice(discountedPrice)
                .ingredients(ingredientDTOs)
                .build();
    }
}
