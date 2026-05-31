import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "react-router";
import { Home, ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-indigo-600" />
          </div>
          <CardTitle className="text-4xl font-bold">404</CardTitle>
          <CardDescription className="text-lg">Page not found</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-500">The page you're looking for doesn't exist or has been moved.</p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" asChild>
              <Link to={-1 as any}><ArrowLeft className="w-4 h-4 mr-2" /> Go Back</Link>
            </Button>
            <Button className="flex-1" asChild>
              <Link to="/"><Home className="w-4 h-4 mr-2" /> Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
