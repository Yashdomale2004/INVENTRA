# INVENTRA Database Schema

## Core Tables
- auth_user
- inventory_category
- inventory_brand
- inventory_distributor
- inventory_supplier
- inventory_product
- inventory_productsize
- inventory_stocktransaction
- inventory_stock_allocation
- inventory_stock_allocation_item
- parcels_parcel
- parcels_parcelhistory
- notifications_app_notification
- reports_report
- inventory_appsetting

## Key Relationships
- Product -> Category (FK)
- Product -> Brand (FK)
- ProductSize -> Product (FK)
- StockTransaction -> Product (FK)
- StockTransaction -> ProductSize (FK)
- StockTransaction -> Distributor/Supplier (nullable FK)
- AllocationItem -> Allocation (FK)
- AllocationItem -> Product, ProductSize (FK)
- Parcel -> Product (FK)
- Parcel -> Distributor/Supplier (nullable FK)
- ParcelHistory -> Parcel (FK)
