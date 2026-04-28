package database

import (
	"log"

	"earsip-backend/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func Seed(db *gorm.DB) {
	log.Println("Running database seeder...")

	// Seed Organizations
	var orgCount int64
	db.Model(&models.Organization{}).Count(&orgCount)
	if orgCount == 0 {
		orgs := []models.Organization{
			{Name: "Dinas Komunikasi dan Informatika", Code: "DISKOMINFO"},
			{Name: "Dinas Pendidikan", Code: "DISDIK"},
			{Name: "Dinas Kesehatan", Code: "DINKES"},
		}
		db.Create(&orgs)

		// Sub-organizations
		subOrgs := []models.Organization{
			{Name: "Bidang Infrastruktur TI", Code: "BID-INFRA", ParentID: &orgs[0].ID},
			{Name: "Bidang Aplikasi", Code: "BID-APP", ParentID: &orgs[0].ID},
			{Name: "Seksi Jaringan", Code: "SEK-NET", ParentID: &orgs[0].ID},
		}
		db.Create(&subOrgs)
		log.Println("  - Organizations seeded")
	}

	var roleCount int64
	db.Model(&models.Role{}).Count(&roleCount)
	if roleCount == 0 {
		roles := []models.Role{
			{Name: "Super Admin", Code: "superadmin", Description: "Administrator utama aplikasi"},
			{Name: "Admin", Code: "admin", Description: "Admin Unit / Pencatat Surat"},
			{Name: "Pegawai", Code: "pegawai", Description: "Pengguna biasa / penerima surat"},
		}
		db.Create(&roles)
		log.Println("  - Roles seeded")
	}

	// Seed Positions
	var posCount int64
	db.Model(&models.Position{}).Count(&posCount)
	if posCount == 0 {
		var org models.Organization
		db.First(&org)
		positions := []models.Position{
			{Name: "Kepala Dinas", OrganizationID: org.ID, Level: 1},
			{Name: "Sekretaris", OrganizationID: org.ID, Level: 2},
			{Name: "Kepala Bidang", OrganizationID: org.ID, Level: 3},
			{Name: "Kepala Seksi", OrganizationID: org.ID, Level: 4},
			{Name: "Staff", OrganizationID: org.ID, Level: 5},
		}
		db.Create(&positions)
		log.Println("  - Positions seeded")
	}

	// Seed Admin User
	var userCount int64
	db.Model(&models.User{}).Count(&userCount)
	if userCount == 0 {
		hashedPwd, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		var org models.Organization
		var pos models.Position
		db.First(&org)
		db.First(&pos)

		users := []models.User{
			{
				Username:       "admin",
				Email:          "admin@earsip.go.id",
				Password:       string(hashedPwd),
				FullName:       "Administrator Sistem",
				NIP:            "199001012020011001",
				Role:           "superadmin",
				OrganizationID: org.ID,
				PositionID:     pos.ID,
				IsActive:       true,
			},
		}

		// Create additional users
		adminPwd, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		pegawai1Pwd, _ := bcrypt.GenerateFromPassword([]byte("pegawai123"), bcrypt.DefaultCost)
		pegawai2Pwd, _ := bcrypt.GenerateFromPassword([]byte("pegawai123"), bcrypt.DefaultCost)
		pegawai3Pwd, _ := bcrypt.GenerateFromPassword([]byte("pegawai123"), bcrypt.DefaultCost)

		users = append(users,
			models.User{
				Username: "admin_op", Email: "admin_op@earsip.go.id", Password: string(adminPwd),
				FullName: "Admin Operasional", NIP: "199201012020011002", Role: "admin",
				OrganizationID: org.ID, PositionID: pos.ID, IsActive: true,
			},
			models.User{
				Username: "pegawai1", Email: "pegawai1@earsip.go.id", Password: string(pegawai1Pwd),
				FullName: "Pegawai Satu", NIP: "198801012020011003", Role: "pegawai",
				OrganizationID: org.ID, PositionID: pos.ID, IsActive: true,
			},
			models.User{
				Username: "pegawai2", Email: "pegawai2@earsip.go.id", Password: string(pegawai2Pwd),
				FullName: "Pegawai Dua", NIP: "198501012020011004", Role: "pegawai",
				OrganizationID: org.ID, PositionID: pos.ID, IsActive: true,
			},
			models.User{
				Username: "pegawai3", Email: "pegawai3@earsip.go.id", Password: string(pegawai3Pwd),
				FullName: "Pegawai Tiga", NIP: "199301012020011005", Role: "pegawai",
				OrganizationID: org.ID, PositionID: pos.ID, IsActive: true,
			},
		)
		db.Create(&users)
		log.Println("  - Users seeded (admin/admin123 (superadmin), admin_op/admin123 (admin), pegawai1-3/pegawai123 (pegawai))")
	}

	// Seed Classifications
	var classCount int64
	db.Model(&models.Classification{}).Count(&classCount)
	if classCount == 0 {
		classes := []models.Classification{
			{Code: "KP", Name: "Kepegawaian", RetentionActiveYears: 5, RetentionInactiveYears: 10},
			{Code: "KU", Name: "Keuangan", RetentionActiveYears: 5, RetentionInactiveYears: 10},
			{Code: "OT", Name: "Organisasi dan Tata Laksana", RetentionActiveYears: 5, RetentionInactiveYears: 10},
			{Code: "PR", Name: "Perencanaan", RetentionActiveYears: 5, RetentionInactiveYears: 10},
			{Code: "HK", Name: "Hukum", RetentionActiveYears: 10, RetentionInactiveYears: 10},
		}
		db.Create(&classes)

		// Sub-classifications
		subClasses := []models.Classification{
			{Code: "KP.01", Name: "Formasi dan Bezetting", ParentID: &classes[0].ID, RetentionActiveYears: 3, RetentionInactiveYears: 5},
			{Code: "KP.02", Name: "Pengadaan Pegawai", ParentID: &classes[0].ID, RetentionActiveYears: 3, RetentionInactiveYears: 5},
			{Code: "KU.01", Name: "Anggaran", ParentID: &classes[1].ID, RetentionActiveYears: 5, RetentionInactiveYears: 10},
			{Code: "KU.02", Name: "Perbendaharaan", ParentID: &classes[1].ID, RetentionActiveYears: 5, RetentionInactiveYears: 10},
		}
		db.Create(&subClasses)
		log.Println("  - Classifications seeded")
	}

	// Seed Letter Types
	var ltCount int64
	db.Model(&models.LetterType{}).Count(&ltCount)
	if ltCount == 0 {
		types := []models.LetterType{
			{Name: "Surat Tugas", Code: "ST"},
			{Name: "Surat Edaran", Code: "SE"},
			{Name: "Surat Keputusan", Code: "SK"},
			{Name: "Surat Undangan", Code: "SU"},
			{Name: "Surat Pemberitahuan", Code: "SP"},
			{Name: "Nota Dinas", Code: "ND"},
			{Name: "Surat Perintah", Code: "SPr"},
		}
		db.Create(&types)
		log.Println("  - Letter Types seeded")
	}

	// Seed Urgencies
	var urgCount int64
	db.Model(&models.Urgency{}).Count(&urgCount)
	if urgCount == 0 {
		urgencies := []models.Urgency{
			{Name: "Biasa", Code: "B"},
			{Name: "Segera", Code: "S"},
			{Name: "Sangat Segera", Code: "SS"},
		}
		db.Create(&urgencies)
		log.Println("  - Urgencies seeded")
	}

	// Seed Security Levels
	var slCount int64
	db.Model(&models.SecurityLevel{}).Count(&slCount)
	if slCount == 0 {
		levels := []models.SecurityLevel{
			{Name: "Biasa", Code: "B"},
			{Name: "Terbatas", Code: "T"},
			{Name: "Rahasia", Code: "R"},
			{Name: "Sangat Rahasia", Code: "SR"},
		}
		db.Create(&levels)
		log.Println("  - Security Levels seeded")
	}

	// Seed Document Locations
	var dlCount int64
	db.Model(&models.DocumentLocation{}).Count(&dlCount)
	if dlCount == 0 {
		locs := []models.DocumentLocation{
			{Name: "Ruang Arsip Utama", Code: "RAU-01", Room: "Gedung A Lt. 1", Shelf: "Rak A1", Box: "Box 01"},
			{Name: "Ruang Arsip Cadangan", Code: "RAC-01", Room: "Gedung B Lt. 2", Shelf: "Rak B1", Box: "Box 01"},
			{Name: "Brankas Rahasia", Code: "BRK-01", Room: "Gedung A Lt. 3", Shelf: "Brankas 1", Box: "-"},
		}
		db.Create(&locs)
		log.Println("  - Document Locations seeded")
	}

	// Seed Templates
	var tplCount int64
	db.Model(&models.Template{}).Count(&tplCount)
	if tplCount == 0 {
		var stType models.LetterType
		db.Where("code = ?", "ST").First(&stType)
		var seType models.LetterType
		db.Where("code = ?", "SE").First(&seType)

		templates := []models.Template{
			{
				Name:          "Template Surat Tugas",
				LetterTypeID:  stType.ID,
				IsDefault:     true,
				IsActive:      true,
				VariablesJSON: `["nomor_surat","tanggal_surat","pengirim_nama","pengirim_nip","pengirim_jabatan","penerima_nama","perihal","isi_surat","ttd_nama","ttd_nip","ttd_jabatan","qrcode"]`,
				HTMLContent: `<div style="font-family: 'Times New Roman', serif; font-size: 12pt; max-width: 21cm; margin: 0 auto; padding: 2cm;">
<div style="text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 20px;">
<h2 style="margin: 0;">PEMERINTAH DAERAH</h2>
<h3 style="margin: 5px 0;">DINAS KOMUNIKASI DAN INFORMATIKA</h3>
<p style="margin: 0; font-size: 10pt;">Jl. Contoh No. 123, Kota Contoh | Telp (021) 12345678</p>
</div>
<div style="text-align: center; margin-bottom: 20px;">
<h3 style="text-decoration: underline;">SURAT TUGAS</h3>
<p>Nomor: ${nomor_surat}</p>
</div>
<p>Yang bertanda tangan di bawah ini:</p>
<table style="margin-left: 40px; margin-bottom: 15px;">
<tr><td style="width: 120px;">Nama</td><td>: ${pengirim_nama}</td></tr>
<tr><td>NIP</td><td>: ${pengirim_nip}</td></tr>
<tr><td>Jabatan</td><td>: ${pengirim_jabatan}</td></tr>
</table>
<p>Memberikan tugas kepada:</p>
<table style="margin-left: 40px; margin-bottom: 15px;">
<tr><td style="width: 120px;">Nama</td><td>: ${penerima_nama}</td></tr>
</table>
<p><strong>Untuk:</strong></p>
<div style="margin-left: 40px; margin-bottom: 20px;">${isi_surat}</div>
<p>Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.</p>
<div style="margin-top: 40px; text-align: right; margin-right: 40px;">
<p>Kota Contoh, ${tanggal_surat}</p>
<p>${ttd_jabatan}</p>
<div style="margin: 10px 0;">${qrcode}</div>
<p><strong><u>${ttd_nama}</u></strong></p>
<p>NIP. ${ttd_nip}</p>
</div>
</div>`,
			},
			{
				Name:          "Template Surat Edaran",
				LetterTypeID:  seType.ID,
				IsDefault:     true,
				IsActive:      true,
				VariablesJSON: `["nomor_surat","tanggal_surat","pengirim_nama","pengirim_nip","pengirim_jabatan","perihal","isi_surat","ttd_nama","ttd_nip","ttd_jabatan","qrcode"]`,
				HTMLContent: `<div style="font-family: 'Times New Roman', serif; font-size: 12pt; max-width: 21cm; margin: 0 auto; padding: 2cm;">
<div style="text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 20px;">
<h2 style="margin: 0;">PEMERINTAH DAERAH</h2>
<h3 style="margin: 5px 0;">DINAS KOMUNIKASI DAN INFORMATIKA</h3>
<p style="margin: 0; font-size: 10pt;">Jl. Contoh No. 123, Kota Contoh | Telp (021) 12345678</p>
</div>
<div style="text-align: center; margin-bottom: 20px;">
<h3 style="text-decoration: underline;">SURAT EDARAN</h3>
<p>Nomor: ${nomor_surat}</p>
</div>
<p>Perihal: ${perihal}</p>
<p>Kepada Yth,<br/>Seluruh Pegawai di Lingkungan Dinas Komunikasi dan Informatika</p>
<p>Dengan hormat,</p>
<div style="text-indent: 40px; margin-bottom: 20px;">${isi_surat}</div>
<p>Demikian surat edaran ini disampaikan untuk dilaksanakan sebagaimana mestinya.</p>
<div style="margin-top: 40px; text-align: right; margin-right: 40px;">
<p>Kota Contoh, ${tanggal_surat}</p>
<p>${ttd_jabatan}</p>
<div style="margin: 10px 0;">${qrcode}</div>
<p><strong><u>${ttd_nama}</u></strong></p>
<p>NIP. ${ttd_nip}</p>
</div>
</div>`,
			},
		}
		db.Create(&templates)
		log.Println("  - Templates seeded")
	}

	// Seed Groups
	var grpCount int64
	db.Model(&models.Group{}).Count(&grpCount)
	if grpCount == 0 {
		groups := []models.Group{
			{Name: "Tim IT", Description: "Grup pegawai bidang IT"},
			{Name: "Pimpinan", Description: "Grup pejabat pimpinan"},
			{Name: "Semua Pegawai", Description: "Seluruh pegawai dinas"},
		}
		db.Create(&groups)
		log.Println("  - Groups seeded")
	}

	log.Println("Database seeding completed")
}
