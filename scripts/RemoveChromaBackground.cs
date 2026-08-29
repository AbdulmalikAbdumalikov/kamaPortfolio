using System;
using System.Drawing;
using System.Drawing.Imaging;

public static class RemoveChromaBackground
{
    private static int Clamp(int value)
    {
        return Math.Max(0, Math.Min(255, value));
    }

    public static void Run(string inputPath, string outputPath)
    {
        using (var source = new Bitmap(inputPath))
        using (var output = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppArgb))
        {
            for (int y = 0; y < source.Height; y++)
            {
                for (int x = 0; x < source.Width; x++)
                {
                    Color color = source.GetPixel(x, y);
                    int magentaDominance = Math.Min(color.R, color.B) - color.G;
                    int alpha = 255;

                    if (color.R > 120 && color.B > 120 && magentaDominance > 48)
                    {
                        alpha = Clamp(255 - (magentaDominance - 48) * 3);
                    }
                    if (color.R > 165 && color.B > 155 && color.G < 105 && magentaDominance > 82)
                    {
                        alpha = 0;
                    }

                    output.SetPixel(x, y, Color.FromArgb(alpha, color.R, color.G, color.B));
                }
            }

            output.Save(outputPath, ImageFormat.Png);
        }
    }
}
