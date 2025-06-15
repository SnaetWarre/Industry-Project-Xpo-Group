using System;
using System.Security.Cryptography;
using System.Text;

namespace VectorEmbeddingService;

public static class PasswordHasher
{
    public static string HashPassword(string password)
    {
        using (var rng = RandomNumberGenerator.Create())
        {
            // Generate salt
            byte[] salt = new byte[16];
            rng.GetBytes(salt);
            
            // Hash password with salt using PBKDF2
            using (var pbkdf2 = new Rfc2898DeriveBytes(password, salt, 10000, HashAlgorithmName.SHA256))
            {
                byte[] hash = pbkdf2.GetBytes(32);
                
                // Combine salt + hash
                byte[] hashBytes = new byte[48];
                Array.Copy(salt, 0, hashBytes, 0, 16);
                Array.Copy(hash, 0, hashBytes, 16, 32);
                
                return Convert.ToBase64String(hashBytes);
            }
        }
    }
    
    public static bool VerifyPassword(string password, string hash)
    {
        try
        {
            byte[] hashBytes = Convert.FromBase64String(hash);
            
            // Extract salt
            byte[] salt = new byte[16];
            Array.Copy(hashBytes, 0, salt, 0, 16);
            
            // Hash the input password with the same salt
            using (var pbkdf2 = new Rfc2898DeriveBytes(password, salt, 10000, HashAlgorithmName.SHA256))
            {
                byte[] testHash = pbkdf2.GetBytes(32);
                
                // Compare with stored hash
                for (int i = 0; i < 32; i++)
                {
                    if (hashBytes[i + 16] != testHash[i])
                        return false;
                }
                return true;
            }
        }
        catch
        {
            return false;
        }
    }
    
    // Utility method to generate hashes for your passwords
    public static void GenerateHashesForConfig()
    {
        Console.WriteLine("Password Hash Generator");
        Console.WriteLine("======================");
        Console.Write("Enter password to hash: ");
        var password = Console.ReadLine() ?? string.Empty;
        var hash = HashPassword(password);
        Console.WriteLine($"Hash:   {hash}");
        Console.WriteLine("Copy the hashed value to your appsettings.json 'Password' field");
    }
    
    public static void HashSinglePassword(string password)
    {
        var hash = HashPassword(password);
        Console.WriteLine($"Password: {password}");
        Console.WriteLine($"Hash:     {hash}");
    }
} 