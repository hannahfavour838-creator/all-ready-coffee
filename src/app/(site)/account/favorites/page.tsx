import { requireUser } from "@/lib/auth/session";
import { getFavorites } from "@/server/queries/account";
import { ProductCard } from "@/components/menu/ProductCard";
import { EmptyState } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Favorites" };

export default async function FavoritesPage() {
  const user = await requireUser("/account/favorites");
  const favorites = await getFavorites(user.id);
  return (
    <div className="space-y-10">
      <header>
        <p className="eyebrow mb-3">Favorites</p>
        <h1 className="font-display text-display-md text-cream">Your short list.</h1>
      </header>
      {favorites.length === 0 ? (
        <EmptyState title="No favorites yet" body="Tap the heart on any drink and it'll wait for you here, ready to add in one tap." action={<ButtonLink href="/menu">Explore the menu</ButtonLink>} />
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3">
          {favorites.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
