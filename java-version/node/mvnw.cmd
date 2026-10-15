@REM ============================================================
@REM Maven Wrapper startup batch script (self-contained, no JAR)
@REM Downloads Maven 3.9.9 to ~/.m2/wrapper if not already cached
@REM ============================================================
@echo off
setlocal

SET MAVEN_VERSION=3.9.9
SET MAVEN_HOME=%USERPROFILE%\.m2\wrapper\apache-maven-%MAVEN_VERSION%
SET MAVEN_ZIP_URL=https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/%MAVEN_VERSION%/apache-maven-%MAVEN_VERSION%-bin.zip
SET MAVEN_ZIP=%USERPROFILE%\.m2\wrapper\apache-maven-%MAVEN_VERSION%-bin.zip

IF NOT EXIST "%MAVEN_HOME%\bin\mvn.cmd" (
    echo Downloading Maven %MAVEN_VERSION%...
    powershell -Command "& {Invoke-WebRequest '%MAVEN_ZIP_URL%' -OutFile '%MAVEN_ZIP%'}"
    powershell -Command "& {Expand-Archive '%MAVEN_ZIP%' -DestinationPath '%USERPROFILE%\.m2\wrapper' -Force}"
    del "%MAVEN_ZIP%"
    echo Maven %MAVEN_VERSION% installed.
)

"%MAVEN_HOME%\bin\mvn.cmd" %*
