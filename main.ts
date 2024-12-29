// Importamos las dependencias necesarias
import { Application, Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { ApolloServer } from "npm:@apollo/server@4.11.2";
import { startStandaloneServer } from "npm:@apollo/server/standalone";
import { buildSchema } from "npm:graphql@16.10.0";

// Definimos el esquema GraphQL
const typeDefs = `
  type Ability {
    name: String
    effect: String
  }

  type Move {
    name: String
    power: Int
  }

  type Pokemon {
    id: ID
    name: String
    abilities: [Ability]
    moves: [Move]
  }

  type Query {
    pokemon(id: Int, name: String): Pokemon
  }
`;

// Implementamos los resolvers
const resolvers = {
  Query: {
    pokemon: async (_: any, args: { id?: number; name?: string }) => {
      const baseUrl = "https://pokeapi.co/api/v2/pokemon/";
      let url = "";

      // Construimos la URL según ID o nombre
      if (args.id) url = `${baseUrl}${args.id}`;
      else if (args.name) url = `${baseUrl}${args.name.toLowerCase()}`;
      else throw new Error("Debes proporcionar un ID o nombre del Pokémon.");

      // Llamada a la API REST
      const response = await fetch(url);
      if (!response.ok) throw new Error("Pokémon no encontrado.");
      const data = await response.json();

      return {
        id: data.id,
        name: data.name,
        abilities: data.abilities,
        moves: data.moves,
      };
    },
  },

  Pokemon: {
    abilities: async (parent: any) => {
      // Obtenemos y procesamos las habilidades
      const abilities = await Promise.all(
        parent.abilities.map(async (ability: any) => {
          const response = await fetch(ability.ability.url);
          const data = await response.json();

          // Filtramos la descripción en inglés
          const effectEntry = data.effect_entries.find(
            (entry: any) => entry.language.name === "en"
          );

          return {
            name: ability.ability.name,
            effect: effectEntry ? effectEntry.effect : "No description available.",
          };
        })
      );
      return abilities;
    },

    moves: async (parent: any) => {
      // Obtenemos y procesamos los movimientos
      const moves = await Promise.all(
        parent.moves.map(async (move: any) => {
          const response = await fetch(move.move.url);
          const data = await response.json();

          return {
            name: move.move.name,
            power: data.power || 0, // Si no tiene power, devolvemos 0
          };
        })
      );
      return moves;
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 8000 },
});

console.log(`🚀 Servidor GraphQL listo en: ${url}`);
