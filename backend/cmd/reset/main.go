package main

import (
	"database/sql"
	"fmt"
	"log"

	"earsip-backend/internal/config"

	_ "github.com/go-sql-driver/mysql"
)

func main() {
	config.Load()
	cfg := config.AppConfig

	// Connect to MySQL without specifying the database
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.DBUser, cfg.DBPass, cfg.DBHost, cfg.DBPort)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal("Error connecting to database:", err)
	}
	defer db.Close()

	// Drop and recreate database
	_, err = db.Exec(fmt.Sprintf("DROP DATABASE IF EXISTS %s", cfg.DBName))
	if err != nil {
		log.Fatal("Error dropping database:", err)
	}
	log.Printf("Dropped database %s", cfg.DBName)

	_, err = db.Exec(fmt.Sprintf("CREATE DATABASE %s", cfg.DBName))
	if err != nil {
		log.Fatal("Error creating database:", err)
	}
	log.Printf("Created database %s", cfg.DBName)

	log.Println("Database reset successfully. You can now start the main server")
}
