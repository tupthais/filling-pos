plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

val apiBaseUrl = providers.gradleProperty("POS_API_BASE_URL").orElse("http://10.0.2.2:3000").get()

val apiBranchId = providers.gradleProperty("POS_BRANCH_ID").orElse("").get()
val apiTenantId = providers.gradleProperty("POS_TENANT_ID").orElse("").get()
val androidBuildDir = providers.gradleProperty("ANDROID_BUILD_DIR").orNull
if (androidBuildDir != null) layout.buildDirectory.set(file(androidBuildDir))

android { namespace = "com.filling.pos"; compileSdk = 35
    buildFeatures { buildConfig = true }
    defaultConfig { buildConfigField("String", "API_BASE_URL", "\"$apiBaseUrl\"") }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
    defaultConfig { applicationId = "com.filling.pos"; minSdk = 23; targetSdk = 35; versionCode = 1; versionName = "0.1.0"; buildConfigField("String", "BRANCH_ID", "\"$apiBranchId\""); buildConfigField("String", "TENANT_ID", "\"$apiTenantId\"") }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2025.01.00"))
    implementation("androidx.activity:activity-compose:1.10.0")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
    implementation("androidx.room:room-runtime:2.7.0")
    implementation("androidx.room:room-ktx:2.7.0")
    implementation("androidx.work:work-runtime-ktx:2.10.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
}
