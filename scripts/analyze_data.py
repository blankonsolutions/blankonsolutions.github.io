import os

root_dir = r"D:\01_사업_및_업무\디에스종합환경\현장사진 - 복사본"

def analyze():
    stats = []
    total_images = 0
    for root, dirs, files in os.walk(root_dir):
        images = [f for f in files if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        if images:
            count = len(images)
            total_images += count
            stats.append((root, count))
    
    print(f"Total Images found: {total_images}")
    print("-" * 30)
    for path, count in stats:
        # relative path from root
        rel = os.path.relpath(path, root_dir)
        print(f"{rel}: {count} images")

if __name__ == "__main__":
    analyze()
