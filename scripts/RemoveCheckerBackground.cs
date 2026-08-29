using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;

public static class RemoveCheckerBackground
{
    private static bool IsBackground(Color color)
    {
        int maximum = Math.Max(color.R, Math.Max(color.G, color.B));
        int minimum = Math.Min(color.R, Math.Min(color.G, color.B));
        return minimum >= 225 && maximum - minimum <= 18;
    }

    public static void Run(string inputPath, string outputPath)
    {
        using (var source = new Bitmap(inputPath))
        using (var output = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppArgb))
        {
            int width = source.Width;
            int height = source.Height;
            var background = new bool[width * height];
            var queue = new Queue<int>();

            Action<int, int> enqueue = (x, y) =>
            {
                int index = y * width + x;
                if (!background[index] && IsBackground(source.GetPixel(x, y)))
                {
                    background[index] = true;
                    queue.Enqueue(index);
                }
            };

            for (int x = 0; x < width; x++)
            {
                enqueue(x, 0);
                enqueue(x, height - 1);
            }
            for (int y = 0; y < height; y++)
            {
                enqueue(0, y);
                enqueue(width - 1, y);
            }

            while (queue.Count > 0)
            {
                int index = queue.Dequeue();
                int x = index % width;
                int y = index / width;
                if (x > 0) enqueue(x - 1, y);
                if (x + 1 < width) enqueue(x + 1, y);
                if (y > 0) enqueue(x, y - 1);
                if (y + 1 < height) enqueue(x, y + 1);
            }

            for (int y = 0; y < height; y++)
            {
                for (int x = 0; x < width; x++)
                {
                    int index = y * width + x;
                    Color color = source.GetPixel(x, y);
                    output.SetPixel(x, y, background[index]
                        ? Color.FromArgb(0, color.R, color.G, color.B)
                        : Color.FromArgb(255, color.R, color.G, color.B));
                }
            }

            output.Save(outputPath, ImageFormat.Png);
        }
    }
}
