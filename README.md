# Hospital Management System API

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-%3E%3D4.4-green.svg)](https://www.mongodb.com/)
[![Express.js](https://img.shields.io/badge/Express.js-4.17-lightgrey.svg)](https://expressjs.com/)
[![Code Style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://prettier.io/)
[![ESLint: Airbnb](https://img.shields.io/badge/eslint-airbnb-blue.svg)](https://github.com/airbnb/javascript)

A comprehensive RESTful API for hospital management built with Node.js, Express.js, and MongoDB. This system provides complete functionality for appointment booking, patient management, and administrative features.

> 🎓 **Course Assignment Project**: Developed as part of backend development coursework demonstrating RESTful API design, authentication, authorization, and database management.

## 📑 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#️-installation)
- [Project Structure](#-project-structure)
- [API Endpoints](#️-api-endpoints)
- [Documentation](#-documentation)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)
- [Author](#-author)

## 🏥 Features

- **Authentication & Authorization**
  - JWT-based authentication
  - Role-based access control (Admin, Doctor, Patient)
  - Password reset functionality
  - Secure cookie handling

- **Patient Management**
  - Patient registration and profiles
  - Medical history tracking
  - Appointment scheduling

- **Doctor Management**
  - Doctor profiles and specializations
  - Availability management
  - Appointment handling

- **Administrative Features**
  - User management
  - System monitoring
  - Data analytics

- **Security Features**
  - Rate limiting
  - CORS protection
  - Helmet security headers
  - HPP protection
  - Input validation and sanitization

## 🚀 Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer with Sharp for image processing
- **Email**: Nodemailer for email notifications
- **Validation**: Express Validator
- **Security**: Helmet, CORS, HPP, Rate Limiting

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

## ⚙️ Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/3mr-5aled/hospital-api.git
   cd hospital-api
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Configuration**

   Copy the example environment file and configure it:

   ```bash
   cp .env.example config.env
   ```

   Edit `config.env` with your settings:

   ```env
   NODE_ENV=development
   PORT=8000

   # Database
   db_uri=mongodb://localhost:27017/hospital-db
   # Or use MongoDB Atlas
   # db_uri=mongodb+srv://username:password@cluster.mongodb.net/database

   # JWT
   JWT_SECRET_KEY=your-super-secret-jwt-key-min-32-chars
   JWT_EXPIRE_TIME=90d

   # Email Configuration (Gmail example)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-specific-password

   # Other configurations
   BASE_URL=http://localhost:8000
   ```

   > ⚠️ **Security**: Never commit `config.env` to version control. Use `.env.example` as a template.

4. **Start MongoDB**

   ```bash
   # If using local MongoDB
   mongod

   # Or use MongoDB Atlas (cloud database)
   ```

5. **Start the application**

   **Development mode:** (User, Patient, Doctor, etc.)
   │ ├── routes/ # Express routes
   │ ├── services/ # Business logic services
   │ ├── utils/ # Utility functions (errors, helpers, email)
   │ └── validators/ # Input validation schemas
   ├── postman/ # Postman collections and test suites
   ├── uploads/ # File upload directory
   ├── server.js # Application entry point
   ├── config.env # Environment variables (DO NOT COMMIT)
   ├── .env.example # Environment template
   ├── package.json # Project dependencies
   ├── DATABASE_SCHEMA.md # Database schema documentation
   └── README.md # Project documentation

````

For detailed database schema information, see [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).```bash
   npm run start:prod
````

## 📁 Project Structure

````
hospital-api/
├── src/
│   ├── config/         # Database and app configuration
│   ├── controllers/    # Route controllers
│   ├── middlewares/    # Custom middleware functions
│   ├── models/         # Mongoose models
│   ├── routes/         # Express routes
│   ├── services/       # Business logic services
│   ├── utils/          # Utility functions
│   └── validators/     # Input validation schemas
├── server.js           # Application entry point
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/auth/signup` | User registration | No |
| POST | `/api/v1/auth/login` | User login | No |
| GET | `/api/v1/auth/logout` | User logout | Yes |
| POST | `/api/v1/auth/forgotPassword` | Request password reset | No |
| PUT | `/api/v1/auth/resetPassword/:token` | Reset password with token | No |

### Patients
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/patients` | Get all patients | Admin/Doctor |
| GET | `/api/v1/patients/:id` | Get patient by ID | Yes |
| POST | `/api/v1/patients` | Create patient profile | Patient |
| PUT | `/api/v1/patients/:id` | Update patient | Patient |
| DELETE | `/api/v1/patients/:id` | Delete patient | Admin |

### Doctors
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/doctors` | Get all doctors | No |
| GET | `/api/v1/doctors/:id` | Get doctor by ID | No |
| POST | `/api/v1/doctors` | Create doctor profile | Admin |
| PUT | `/api/v1/doctors/:id` | Update doctor | Doctor/Admin |
| DELETE | `/api/v1/doctors/:id` | Delete doctor | Admin |

### Clinics
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/clinics` | Get all clinics | No |
| GET | `/api/v1/clinics/:id` | Get clinic by ID | No |
| POST | `/api/v1/clinics` | Create clinic | Admin |
| PUT | `/api/v1/clinics/:id` | Update clinic | Admin |
| DELETE | `/api/v1/clinics/:id` | Delete clinic | Admin |

### Appointments
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/appointments` | Get appointments | Yes |
| GET | `/api/v1/appointments/:id` | Get appointment by ID | Yes |
| POST | `/api/v1/appointments` | Create appointment | Patient |
| PU� Testing

### Postman Collections

Comprehensive Postman collections are available in the `postman/` directory:

```bash
cd postman
npm install
npm test  # Run automated test suite
````

See [postman/README.md](postman/README.md) for detailed testing instructions.

### Manual Testing

1. Import `postman/Hospital-Management-API.postman_collection.json` into Postman
2. Import the appropriate environment file
3. Start with Authentication endpoints to get JWT token
4. Use the token for protected endpoints

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

\*\*Qu� Documentation

- [Database Schema](DATABASE_SCHEMA.md) - Detailed database design and relationships
- [Contributing Guidelines](CONTRIBUTING.md) - How to contribute to this project
- [Security Policy](SECURITY.md) - Security guidelines and vulnerability reporting
- [Postman Documentation](postman/README.md) - API testing and automation

**Additional Resources:**

- [API Reference](API_REFERENCE.md) - Complete endpoint documentation with examples
- [Quick Start Guide](QUICKSTART.md) - Get started in 5 minutes
- [Deployment Guide](DEPLOYMENT.md) - Deploy to Heroku, AWS, Vercel, DigitalOcean
- [Changelog](CHANGELOG.md) - Version history and release notes

## 🚀 Deployment

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

### Environment Preparation

1. Set `NODE_ENV=production` in your environment
2. Use strong, unique JWT secret (32+ characters)
3. Enable HTTPS
4. Configure production database
5. Set up proper CORS origins
6. Configure production email service

### Deployment Platforms

This API can be deployed on:

- **Heroku**: Easy deployment with MongoDB Atlas ([Guide](DEPLOYMENT.md#option-1-heroku-deployment))
- **AWS EC2**: Full control over infrastructure ([Guide](DEPLOYMENT.md#option-4-aws-ec2-deployment))
- **DigitalOcean**: Droplets with Node.js support ([Guide](DEPLOYMENT.md#option-3-digitalocean-app-platform))
- **Vercel/Netlify**: Serverless deployment
- **Docker**: Containerized deployment

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Amr Khaled Morcy**

- GitHub: [@3mr-5aled](https://github.com/3mr-5aled)
- LinkedIn: [3mr5aled](https://linkedin.com/in/3mr5aled)
- Email: 3mr5aled.contact@gmail.com

## 🙏 Acknowledgments

- Express.js team for the excellent framework
- MongoDB team for the robust database
- All contributors and maintainers of the open-source packages used
- Course instructors and mentors

## 📞 Support

For support and questions:

- Open an issue on GitHub
- Email: 3mr5aled.contact@gmail.com
- Check existing documentation and closed issues

---

## 🎯 Project Status

This project is **actively maintained** and developed as a course assignment.

### Completed Features ✅

- User authentication and authorization
- Role-based access control (Admin, Doctor, Patient)
- Patient management system
- Doctor profiles and management
- Clinic management
- Appointment scheduling
- Email notifications
- Security features (Rate limiting, CORS, Helmet, HPP)
- Input validation and sanitization
- Error handling middleware
- Postman test collections

### Future Enhancements 🚀

- API documentation with Swagger/OpenAPI
- Unit and integration tests
- Real-time notifications with WebSockets
- Payment integration
- Medical reports and prescriptions PDF generation
- Mobile app API optimization
- Analytics dashboard
- Multi-language support

---

⭐ **If you found this project helpful, please give it a star!**

💼 **Portfolio Project**: This API demonstrates full-stack backend development skills including RESTful API design, authentication, database management, and security best practices.

````bash
npm run lint:fix    # Fix ESLint issues
npm run format      # Format with Prettier
```=production
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## 🔒 Security Features

- **Rate Limiting**: Prevents brute force attacks
- **CORS**: Cross-Origin Resource Sharing protection
- **Helmet**: Sets various HTTP headers for security
- **HPP**: HTTP Parameter Pollution protection
- **Input Validation**: Comprehensive request validation
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 Code Style

This project uses:

- **ESLint** with Airbnb configuration
- **Prettier** for code formatting
- **Node.js** best practices

Run `npm run lint:fix` and `npm run format` before committing.

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Amr Khaled Morcy**

## 🙏 Acknowledgments

- **Course Inspiration**: This project was developed as part of the [Node.js - Build a Full E-Commerce RESTful APIs](https://www.udemy.com/course/nodejs-build-a-full-e-commerce-restful-apis/) course by **Ahmed Boghdady**, **Mahmoud Bakr**, and **Index Academy** on Udemy. The course provided excellent guidance on building production-ready RESTful APIs with Node.js, Express, and MongoDB.
- **Express.js team** for the excellent framework
- **MongoDB team** for the robust database
- **Open Source Community** for all the amazing packages and tools
- All contributors and maintainers of the libraries used in this project

---

⭐ **If you found this project helpful, please give it a star!**
````
