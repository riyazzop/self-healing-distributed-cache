package com.cache.manager.user;

import com.cache.manager.security.JwtService;
import com.cache.manager.user.dto.AuthResponse;
import com.cache.manager.user.dto.LoginRequest;
import com.cache.manager.user.dto.RegisterRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public UserService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("User already exists, please login");
        }
        String name = request.email().split("@")[0];
        String hashedPassword = passwordEncoder.encode(request.password());
        User user = new User(request.email(), name, hashedPassword);
        userRepository.save(user);

        String token = jwtService.generateToken(user.getName(), user.getEmail());
        return new AuthResponse("User created successfully", token);
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new IllegalArgumentException("User not found, please register"));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new IllegalArgumentException("Invalid credentials");
        }

        String token = jwtService.generateToken(user.getName(), user.getEmail());
        return new AuthResponse("Login successful", token);
    }
}
