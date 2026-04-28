package services

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"earsip-backend/internal/database"
	"earsip-backend/internal/models"

	qrcode "github.com/skip2/go-qrcode"
)

type QRCodeData struct {
	DocID     string `json:"doc_id"`
	Signer    string `json:"signer"`
	NIP       string `json:"nip"`
	Position  string `json:"position"`
	SignedAt  string `json:"signed_at"`
	VerifyURL string `json:"verify_url"`
}

func GenerateQRCode(letter *models.Letter, signer *models.User, signerPosition string) (string, error) {
	data := QRCodeData{
		DocID:     letter.LetterNumber,
		Signer:    signer.FullName,
		NIP:       signer.NIP,
		Position:  signerPosition,
		SignedAt:  time.Now().Format(time.RFC3339),
		VerifyURL: fmt.Sprintf("https://sentrarsip.domain.go.id/verify/%d", letter.ID),
	}

	jsonData, _ := json.Marshal(data)
	fileName := fmt.Sprintf("uploads/signatures/qr_%d_%d.png", letter.ID, time.Now().Unix())
	err := qrcode.WriteFile(string(jsonData), qrcode.Medium, 256, fileName)
	if err != nil {
		return "", err
	}

	return fileName, nil
}

func RenderTemplate(htmlContent string, variables map[string]string) string {
	result := htmlContent
	for key, value := range variables {
		result = strings.ReplaceAll(result, "${"+key+"}", value)
	}
	return result
}

func CreateNotification(userID uint, title, message, link string) error {
	notification := models.Notification{
		UserID:  userID,
		Title:   title,
		Message: message,
		Link:    link,
	}
	return database.DB.Create(&notification).Error
}
