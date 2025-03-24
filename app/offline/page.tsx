"use client"

import { useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function OfflinePage() {
  useEffect(() => {
    // Monitora o estado online/offline
    const handleOnline = () => {
      window.location.href = "/";
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-green-400 p-4 font-mono">
      <header className="mb-6">
        <div className="flex justify-center items-center mb-6">
          <h1 className="text-2xl font-bold text-center">CryptoNerd Dashboard</h1>
        </div>
      </header>

      <Card className="bg-gray-900 border-gray-800 overflow-hidden mb-4">
        <CardContent className="p-6 text-center">
          <div className="mb-6">
            <h2 className="text-xl mb-4">Você está offline</h2>
            <p className="text-gray-400 mb-6">
              Não foi possível conectar aos servidores. Verifique sua conexão com a internet e tente novamente.
            </p>
            <Button 
              onClick={() => window.location.reload()} 
              className="bg-green-700 hover:bg-green-600 text-black"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </div>

          <div className="border-t border-gray-800 pt-6 mt-6">
            <h3 className="text-lg mb-4">Dados em cache</h3>
            <p className="text-gray-400">
              Alguns dados podem estar disponíveis mesmo offline, mas podem não estar atualizados.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid grid-cols-2 w-full bg-gray-900 mb-4">
          <TabsTrigger value="info" className="data-[state=active]:bg-gray-800 data-[state=active]:text-green-400">
            Informações
          </TabsTrigger>
          <TabsTrigger value="help" className="data-[state=active]:bg-gray-800 data-[state=active]:text-green-400">
            Ajuda
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-0">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <h3 className="font-bold mb-2">Modo Offline</h3>
              <p className="text-sm text-gray-400 mb-4">
                O CryptoNerd Dashboard funciona offline para permitir acesso a dados salvos anteriormente, mas precisa de conexão para mostrar informações em tempo real.
              </p>
              <p className="text-sm text-gray-400">
                Seu dispositivo automaticamente se reconectará e atualizará os dados quando a conexão for restaurada.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="help" className="mt-0">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <h3 className="font-bold mb-2">Soluções de problemas</h3>
              <ul className="text-sm text-gray-400 space-y-2">
                <li>• Verifique se o modo avião está desativado</li>
                <li>• Verifique sua conexão Wi-Fi ou dados móveis</li>
                <li>• Reinicie seu dispositivo</li>
                <li>• Limpe o cache do navegador</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 