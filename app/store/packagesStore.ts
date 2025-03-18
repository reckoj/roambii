// import { create } from "zustand";
// import { getAllPackages } from "@/lib/appwrite";

// interface Package {
//   $id: string;
//   name: string;
//   price: string;
//   imageUrl: string | null;
// }

// interface PackagesStore {
//   packages: Package[];
//   loading: boolean;
//   hasMore: boolean;
//   offset: number;
//   fetchPackages: (reset?: boolean) => Promise<void>;
// }

// export const usePackagesStore = create<PackagesStore>((set, get) => ({
//   packages: [],
//   loading: true,
//   hasMore: true,
//   offset: 0,

//   fetchPackages: async (reset = false) => {
//     const { offset, packages } = get();

//     if (reset) {
//       set({ loading: true, packages: [], offset: 0, hasMore: true });
//     }

//     try {
//       const newPackages = await getAllPackages({
//         limit: 6,
//         offset: reset ? 0 : offset,
//       });

//       set((state) => ({
//         packages: reset
//           ? newPackages
//           : [
//               ...state.packages,
//               ...newPackages.filter(
//                 (pkg) => !state.packages.some((p) => p.$id === pkg.$id)
//               ),
//             ], // ✅ Prevent duplicate entries
//         offset: reset ? 6 : state.offset + 6,
//         hasMore: newPackages.length === 6, // ✅ Stop loading if fewer than 6 packages are returned
//         loading: false,
//       }));
//     } catch (error) {
//       console.error("Error fetching packages:", error);
//       set({ loading: false });
//     }
//   },
// }));
