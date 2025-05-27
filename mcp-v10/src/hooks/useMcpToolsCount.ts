import { useState, useEffect } from 'react';

const MCP_TOOLS_URL = 'https://primary-production-f283.up.railway.app/webhook/mcp/tools';

export function useMcpToolsCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function fetchTools() {
      console.log('[useMcpToolsCount] Fetching tools from:', MCP_TOOLS_URL);
      try {
        const res = await fetch(MCP_TOOLS_URL);
        console.log('[useMcpToolsCount] Response status:', res.status);
        if (!res.ok) {
          const errorText = await res.text();
          console.error('[useMcpToolsCount] Response not OK:', res.statusText, errorText);
          throw new Error(`${res.statusText} - ${errorText}`);
        }
        const tools = await res.json(); // espera un array de tools
        console.log('[useMcpToolsCount] Tools received:', tools);
        setCount(tools.length);
        console.log('[useMcpToolsCount] Count set to:', tools.length);
      } catch (e) {
        console.error('[useMcpToolsCount] Error fetching MCP tools:', e);
        // Podrías querer establecer un estado de error aquí también
        setCount(0); // O mantener 0 si falla
        console.log('[useMcpToolsCount] Count set to 0 due to error.');
      }
    }
    fetchTools();
  }, []);

  return count;
}