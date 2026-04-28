use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    routing::{get, post, put},
    Json, Router,
};
use chrono::{Duration, Utc};
use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey, DecodingKey};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, RwLock};
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};

const JWT_SECRET: &[u8] = b"stellarni_super_secret_key_hackathon_only";

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: String, // public key
    exp: usize,
}

#[derive(Deserialize)]
struct LoginRequest {
    public_key: String,
}

#[derive(Serialize)]
struct AuthResponse {
    token: String,
    public_key: String,
}

#[derive(Serialize)]
struct ErrorResponse {
    message: String,
}

// --- Credential types ---

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Credential {
    id: u64,
    name: String,
    role: String,
    hash: String,
    date: String,
    address: String,
    #[serde(default)]
    employer_address: String,
    #[serde(default)]
    institution_address: String,
    #[serde(default)]
    verified: bool,
    #[serde(default)]
    employer_signed: bool,
    #[serde(default)]
    institution_signed: bool,
}

#[derive(Deserialize)]
struct StatusUpdateRequest {
    hash: String,
    employer_signed: Option<bool>,
    institution_signed: Option<bool>,
    verified: Option<bool>,
}

#[derive(Clone)]
struct AppState {
    credentials: Arc<RwLock<Vec<Credential>>>,
}

#[tokio::main]
async fn main() {
    let state = Arc::new(AppState {
        credentials: Arc::new(RwLock::new(Vec::new())),
    });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/login", post(login_handler))
        .route("/api/me", get(me_handler))
        .route("/api/logout", post(logout_handler))
        .route("/api/credentials", get(list_credentials).post(create_credential))
        .route("/api/credentials/status", put(update_credential_status))
        .layer(cors)
        .with_state(state);

    let addr = "127.0.0.1:3000";
    println!("Stellarni Auth Backend running on http://{}", addr);
    let listener = TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn login_handler(
    State(_state): State<Arc<AppState>>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, (StatusCode, Json<ErrorResponse>)> {
    if payload.public_key.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse { message: "Public key is required".to_string() }),
        ));
    }

    let expiration = Utc::now()
        .checked_add_signed(Duration::days(1))
        .expect("valid timestamp")
        .timestamp() as usize;

    let claims = Claims {
        sub: payload.public_key.clone(),
        exp: expiration,
    };

    let token = match encode(&Header::default(), &claims, &EncodingKey::from_secret(JWT_SECRET)) {
        Ok(t) => t,
        Err(_) => return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { message: "Failed to generate token".to_string() }),
        )),
    };

    Ok(Json(AuthResponse {
        token,
        public_key: payload.public_key,
    }))
}

async fn me_handler(
    headers: HeaderMap,
) -> Result<Json<AuthResponse>, (StatusCode, Json<ErrorResponse>)> {
    let auth_header = headers.get("Authorization").and_then(|h| h.to_str().ok());
    
    let token = match auth_header {
        Some(header) if header.starts_with("Bearer ") => header.trim_start_matches("Bearer "),
        _ => return Err((
            StatusCode::UNAUTHORIZED,
            Json(ErrorResponse { message: "Missing or invalid Authorization header".to_string() }),
        )),
    };

    let token_data = match decode::<Claims>(
        token,
        &DecodingKey::from_secret(JWT_SECRET),
        &Validation::default(),
    ) {
        Ok(c) => c,
        Err(_) => return Err((
            StatusCode::UNAUTHORIZED,
            Json(ErrorResponse { message: "Invalid or expired token".to_string() }),
        )),
    };

    Ok(Json(AuthResponse {
        token: token.to_string(),
        public_key: token_data.claims.sub,
    }))
}

async fn logout_handler() -> Json<AuthResponse> {
    Json(AuthResponse {
        token: "".to_string(),
        public_key: "".to_string(),
    })
}

// --- Credential endpoints ---

/// GET /api/credentials — list all credentials
async fn list_credentials(
    State(state): State<Arc<AppState>>,
) -> Json<Vec<Credential>> {
    let creds = state.credentials.read().unwrap();
    Json(creds.clone())
}

/// POST /api/credentials — register a new credential
async fn create_credential(
    State(state): State<Arc<AppState>>,
    Json(mut cred): Json<Credential>,
) -> (StatusCode, Json<Credential>) {
    let mut creds = state.credentials.write().unwrap();
    cred.id = Utc::now().timestamp_millis() as u64;
    cred.verified = false;
    cred.employer_signed = false;
    cred.institution_signed = false;
    creds.insert(0, cred.clone());
    (StatusCode::CREATED, Json(cred))
}

/// PUT /api/credentials/status — update credential signature/verification status
async fn update_credential_status(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<StatusUpdateRequest>,
) -> Result<Json<Credential>, (StatusCode, Json<ErrorResponse>)> {
    let mut creds = state.credentials.write().unwrap();
    if let Some(cred) = creds.iter_mut().find(|c| c.hash == payload.hash) {
        if let Some(s) = payload.employer_signed { cred.employer_signed = s; }
        if let Some(s) = payload.institution_signed { cred.institution_signed = s; }
        if let Some(v) = payload.verified { cred.verified = v; }
        Ok(Json(cred.clone()))
    } else {
        Err((
            StatusCode::NOT_FOUND,
            Json(ErrorResponse { message: "Credential not found".to_string() }),
        ))
    }
}
